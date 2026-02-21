/**
 * Video Modal Component
 * 
 * Modal za prikaz video tutoriala (YouTube, Vimeo, ili eksterni link)
 */

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface VideoModalData {
  title: string;
  videoUrl: string;
  videoType: 'youtube' | 'vimeo' | 'external';
}

@Component({
  selector: 'app-video-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './video-modal.component.html',
  styleUrl: './video-modal.component.scss',
})
export class VideoModalComponent {
  safeUrl: SafeResourceUrl | null = null;
  externalUrl: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<VideoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VideoModalData,
    private sanitizer: DomSanitizer
  ) {
    this.processVideoUrl();
  }

  processVideoUrl(): void {
    if (this.data.videoType === 'youtube') {
      // Konvertuj YouTube URL u embed format
      const videoId = this.extractYouTubeId(this.data.videoUrl);
      if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      }
    } else if (this.data.videoType === 'vimeo') {
      // Konvertuj Vimeo URL u embed format
      const videoId = this.extractVimeoId(this.data.videoUrl);
      if (videoId) {
        const embedUrl = `https://player.vimeo.com/video/${videoId}`;
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      }
    } else {
      // Eksterni link – dozvoljen samo https (bezbednost: ne javascript:, data:, itd.)
      const url = (this.data.videoUrl || '').trim();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        this.externalUrl = url;
      }
    }
  }

  extractYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  extractVimeoId(url: string): string | null {
    const regExp = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  openExternal(): void {
    if (this.externalUrl) {
      window.open(this.externalUrl, '_blank');
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
