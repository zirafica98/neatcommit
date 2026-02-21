/**
 * Documentation Service
 * 
 * Generiše dokumentaciju za projekat koristeći AI.
 * 
 * Proces:
 * 1. Fetchuje sve fajlove iz repozitorijuma
 * 2. Analizira strukturu projekta
 * 3. Koristi LLM da generiše dokumentaciju
 * 4. Kreira .doc fajl sa dokumentacijom
 */

import { getInstallationOctokit } from './github-app.service';
import { logger } from '../utils/logger';
// import { analyzeWithLLM } from './llm.service'; // Not used - using direct OpenAI call for documentation
import { detectLanguage } from '../utils/language-detector';
// import { parseCode } from '../utils/ast-parser'; // Not used
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as path from 'path';

export interface RepositoryFile {
  path: string;
  content: string;
  language: string;
  size: number;
  lines: number;
}

export interface FolderStructure {
  path: string;
  name: string;
  files: RepositoryFile[];
  subfolders: FolderStructure[];
  purpose?: string; // Will be determined by LLM
}

export interface ProjectStructure {
  languages: Record<string, number>; // language -> file count
  totalFiles: number;
  totalLines: number;
  mainFiles: RepositoryFile[]; // Important files (package.json, README, etc.)
  sourceFiles: RepositoryFile[]; // Source code files
  configFiles: RepositoryFile[]; // Config files
  folderStructure: FolderStructure; // Hierarchical folder structure
}

/**
 * Fetchuje sve fajlove iz repozitorijuma
 */
export async function fetchRepositoryFiles(
  installationId: number,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<RepositoryFile[]> {
  try {
    const octokit = await getInstallationOctokit(installationId);

    if (!octokit.rest) {
      throw new Error('Octokit instance does not have rest property');
    }

    logger.info('Fetching repository files', { owner, repo, branch });

    const files: RepositoryFile[] = [];
    const ignoredPaths = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '.cache',
      'coverage',
      '.env',
      '.DS_Store',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ];

    // Rekurzivno fetchuj fajlove
    async function fetchDirectory(dirPath: string = '') {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: dirPath || '.',
          ref: branch,
        });

        if (Array.isArray(data)) {
          // Direktorijum
          for (const item of data) {
            if (item.type === 'file') {
              // Proveri da li treba da ignorišemo ovaj fajl
              const shouldIgnore = ignoredPaths.some((ignored) =>
                item.path.includes(ignored)
              );

              if (shouldIgnore) {
                continue;
              }

              try {
                // Fetchuj sadržaj fajla
                const { data: fileData } = await octokit.rest.repos.getContent({
                  owner,
                  repo,
                  path: item.path,
                  ref: branch,
                });

                if (Array.isArray(fileData) || fileData.type !== 'file') {
                  continue;
                }

                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                const languageInfo = detectLanguage(item.path);
                const lines = content.split('\n').length;

                files.push({
                  path: item.path,
                  content,
                  language: languageInfo?.language || 'unknown',
                  size: content.length,
                  lines,
                });
              } catch (error) {
                logger.warn('Failed to fetch file', { path: item.path, error });
                // Nastavi sa sledećim fajlom
              }
            } else if (item.type === 'dir') {
              // Rekurzivno fetchuj poddirektorijum
              await fetchDirectory(item.path);
            }
          }
        }
      } catch (error) {
        logger.error('Failed to fetch directory', { dirPath, error });
      }
    }

    await fetchDirectory();

    logger.info('Repository files fetched', {
      owner,
      repo,
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    });

    return files;
  } catch (error) {
    logger.error('Failed to fetch repository files:', error);
    throw error;
  }
}

/**
 * Analizira strukturu projekta
 */
export function analyzeProjectStructure(files: RepositoryFile[]): ProjectStructure {
  const languages: Record<string, number> = {};
  let totalLines = 0;
  const mainFiles: RepositoryFile[] = [];
  const sourceFiles: RepositoryFile[] = [];
  const configFiles: RepositoryFile[] = [];

  for (const file of files) {
    // Brojaj jezike
    if (file.language !== 'unknown') {
      languages[file.language] = (languages[file.language] || 0) + 1;
    }

    totalLines += file.lines;

    // Kategorizuj fajlove
    const fileName = path.basename(file.path).toLowerCase();
    const filePath = file.path.toLowerCase();

    if (
      fileName === 'readme.md' ||
      fileName === 'readme.txt' ||
      fileName === 'package.json' ||
      fileName === 'requirements.txt' ||
      fileName === 'pom.xml' ||
      fileName === 'build.gradle' ||
      fileName === 'cargo.toml' ||
      fileName === 'go.mod'
    ) {
      mainFiles.push(file);
    } else if (
      filePath.includes('.config') ||
      filePath.includes('config/') ||
      fileName.includes('config') ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.yaml') ||
      fileName.endsWith('.yml') ||
      fileName.endsWith('.toml')
    ) {
      configFiles.push(file);
    } else if (
      file.language !== 'unknown' &&
      !filePath.includes('test') &&
      !filePath.includes('spec') &&
      !filePath.includes('example')
    ) {
      sourceFiles.push(file);
    }
  }

  // Kreiraj hijerarhijsku strukturu foldera
  const folderStructure = buildFolderStructure(files);

  return {
    languages,
    totalFiles: files.length,
    totalLines,
    mainFiles,
    sourceFiles,
    configFiles,
    folderStructure,
  };
}

/**
 * Kreira hijerarhijsku strukturu foldera
 */
function buildFolderStructure(files: RepositoryFile[]): FolderStructure {
  const root: FolderStructure = {
    path: '.',
    name: 'root',
    files: [],
    subfolders: [],
  };

  const folderMap = new Map<string, FolderStructure>();
  folderMap.set('.', root);

  for (const file of files) {
    const pathParts = file.path.split('/');
    pathParts.pop(); // Remove filename, keep only folder path
    let currentPath = '.';

    // Kreiraj strukturu foldera
    for (let i = 0; i < pathParts.length; i++) {
      const folderName = pathParts[i];
      const folderPath = pathParts.slice(0, i + 1).join('/');

      if (!folderMap.has(folderPath)) {
        const parent = folderMap.get(currentPath)!;
        const folder: FolderStructure = {
          path: folderPath,
          name: folderName,
          files: [],
          subfolders: [],
        };
        parent.subfolders.push(folder);
        folderMap.set(folderPath, folder);
      }

      currentPath = folderPath;
    }

    // Dodaj fajl u odgovarajući folder
    const folder = folderMap.get(currentPath)!;
    folder.files.push(file);
  }

  return root;
}

/**
 * Generiše dokumentaciju koristeći LLM
 */
export async function generateDocumentation(
  structure: ProjectStructure,
  _files: RepositoryFile[]
): Promise<string> {
  try {
    logger.info('Generating documentation with LLM', {
      totalFiles: structure.totalFiles,
      totalLines: structure.totalLines,
      languages: Object.keys(structure.languages),
    });

    // Pripremi kontekst za LLM - MNOGO agresivnije optimizovano za TPM limit od 30k
    // Fokusiraj se SAMO na strukturu i najvažnije fajlove, minimalno koda
    const mainFilesContent = structure.mainFiles
      .slice(0, 2) // Samo 2 najvažnija fajla (package.json, README)
      .map((f) => {
        // Truncate na max 150 linija
        const lines = f.content.split('\n');
        const truncated = lines.length > 150 ? lines.slice(0, 150).join('\n') + '\n... (truncated)' : f.content;
        return `${f.path}:\n${truncated}`;
      })
      .join('\n\n---\n\n');

    // Uzmi samo 3 najveća source fajla
    const sortedSourceFiles = [...structure.sourceFiles].sort((a, b) => b.lines - a.lines);
    const sourceFilesSample = sortedSourceFiles
      .slice(0, 3) // Samo 3 najveća fajla
      .map((f) => {
        // Za sve fajlove, uzmi max 200 linija
        const lines = f.content.split('\n');
        const truncated = lines.length > 200 ? lines.slice(0, 200).join('\n') + '\n... (truncated)' : f.content;
        return `${f.path} (${f.language}, ${f.lines} lines):\n${truncated}`;
      })
      .join('\n\n---\n\n');

    // Dodaj samo 2 najvažnija config fajla
    const configFilesContent = structure.configFiles
      .slice(0, 2) // Samo 2 config fajla
      .map((f) => {
        // Truncate na max 80 linija
        const lines = f.content.split('\n');
        const truncated = lines.length > 80 ? lines.slice(0, 80).join('\n') + '\n... (truncated)' : f.content;
        return `${f.path}:\n${truncated}`;
      })
      .join('\n\n---\n\n');

    // Kompaktan project context da smanjimo tokena
    const projectContext = `Project: ${structure.totalFiles} files, ${structure.totalLines} lines
Languages: ${Object.keys(structure.languages).join(', ')}

Main Files:
${mainFilesContent}

Config Files:
${configFilesContent}

Source Code (top 3):
${sourceFilesSample}`;

    // Kompaktan prompt da smanjimo tokena
    const prompt = `Generate comprehensive technical documentation in ENGLISH.

Analyze the project structure and create documentation based on what exists.

Structure:
# 1. PROJECT OVERVIEW
- Project name, purpose, functionality
- Technologies used

# 2. PROJECT STRUCTURE (MOST IMPORTANT)
For each folder:
- Folder path and purpose
- Key files and what they do

For important files:
- File path and purpose
- Main functions/classes
- Interesting code snippets with explanations

# 3. KEY COMPONENTS
- Main modules/services
- How they work and interact

# 4. CONFIGURATION (if exists)
- Config files and their purpose

# 5. SETUP (if exists)
- Installation and running instructions

# 6. ADDITIONAL (only if exists)
- API, Database, Tests, Deployment, Security

Guidelines:
- Only include what exists
- Focus on folder structure
- Include code snippets for interesting parts
- Professional markdown format

PROJECT:
${projectContext}

Generate documentation now.`;

    // Koristi direktan OpenAI poziv za generisanje detaljne dokumentacije
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('Calling OpenAI API for documentation generation...');
    
    // Za dokumentaciju koristimo GPT-4o koji ima veći TPM limit (10M tokens/min)
    // GPT-4-turbo-preview ima samo 30k TPM limit što nije dovoljno
    // Ovo je različito od code review-a koji koristi GPT-3.5-turbo
    const model = process.env.DOCUMENTATION_LLM_MODEL || 'gpt-4o';
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior technical documentation expert. Generate comprehensive, professional documentation for software projects. Focus on folder structure, file purposes, and important code sections. Write in ENGLISH. Be thorough but concise.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000, // Maksimum za GPT-4 model (4096, ali ostavljamo 4000 za sigurnost)
      temperature: 0.2, // Još niža temperatura (0.2) za maksimalnu preciznost i konzistentnost
    });

    const documentation = completion.choices[0]?.message?.content || '';

    logger.info('Documentation generated', {
      length: documentation.length,
    });

    return documentation;
  } catch (error) {
    logger.error('Failed to generate documentation:', error);
    throw error;
  }
}

/**
 * Kreira .docx u memoriji (buffer). Ne upisuje na disk – fajl se čuva samo u Redis-u za jednokratno preuzimanje.
 */
export async function createDocumentationFile(
  documentation: string,
  projectName: string,
  _outputDir?: string
): Promise<{ buffer: Buffer; fileName: string; fileSize: number }> {
  try {
    // Parse markdown u docx strukturu
    const paragraphs: Paragraph[] = [];

    // Dodaj naslov
    paragraphs.push(
      new Paragraph({
        text: projectName,
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    );

    paragraphs.push(
      new Paragraph({
        text: 'Project Documentation',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    paragraphs.push(
      new Paragraph({
        text: `Generated on: ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        spacing: { after: 400 },
      })
    );

    // Parse markdown dokumentaciju
    const lines = documentation.split('\n');
    let currentParagraph: TextRun[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ')) {
        // H1
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({ children: currentParagraph }));
          currentParagraph = [];
        }
        paragraphs.push(
          new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 300 },
          })
        );
      } else if (line.startsWith('## ')) {
        // H2
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({ children: currentParagraph }));
          currentParagraph = [];
        }
        paragraphs.push(
          new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          })
        );
      } else if (line.startsWith('### ')) {
        // H3
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({ children: currentParagraph }));
          currentParagraph = [];
        }
        paragraphs.push(
          new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 150 },
          })
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // List item
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({ children: currentParagraph }));
          currentParagraph = [];
        }
        paragraphs.push(
          new Paragraph({
            text: line.substring(2),
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
      } else if (line.startsWith('```')) {
        // Code block - preskoči za sada (može se dodati kasnije)
        continue;
      } else if (line.length > 0) {
        // Regular text
        currentParagraph.push(new TextRun(line));
        currentParagraph.push(new TextRun({ text: ' ', break: 1 }));
      } else {
        // Empty line
        if (currentParagraph.length > 0) {
          paragraphs.push(new Paragraph({ children: currentParagraph }));
          currentParagraph = [];
        }
        paragraphs.push(new Paragraph({ text: '' }));
      }
    }

    // Dodaj poslednji paragraf ako postoji
    if (currentParagraph.length > 0) {
      paragraphs.push(new Paragraph({ children: currentParagraph }));
    }

    // Kreiraj dokument
    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_')}_documentation_${Date.now()}.docx`;
    const buffer = await Packer.toBuffer(doc);
    const fileSize = buffer.length;

    logger.info('Documentation buffer created (in-memory)', {
      fileName,
      fileSize,
    });

    return {
      buffer,
      fileName,
      fileSize,
    };
  } catch (error) {
    logger.error('Failed to create documentation file:', error);
    throw error;
  }
}
