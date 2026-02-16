/**
 * Lazy Image Directive
 * 
 * Direktiva za lazy loading slika
 */

import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: 'img[appLazyImage]',
  standalone: true,
})
export class LazyImageDirective implements OnInit {
  @Input() appLazyImage: string = '';
  @Input() placeholder: string = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      // Fallback za starije browsere
      this.loadImage();
    }
  }

  private setupIntersectionObserver(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage();
            observer.unobserve(this.el.nativeElement);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    observer.observe(this.el.nativeElement);
  }

  private loadImage(): void {
    const img = this.el.nativeElement;
    
    // Set placeholder first
    if (this.placeholder) {
      this.renderer.setAttribute(img, 'src', this.placeholder);
    }

    // Load actual image
    const imageLoader = new Image();
    imageLoader.onload = () => {
      this.renderer.setAttribute(img, 'src', this.appLazyImage || img.src);
      this.renderer.addClass(img, 'loaded');
    };
    imageLoader.onerror = () => {
      // Fallback image on error
      this.renderer.setAttribute(img, 'src', this.placeholder);
    };
    imageLoader.src = this.appLazyImage || img.getAttribute('src') || '';
  }
}
