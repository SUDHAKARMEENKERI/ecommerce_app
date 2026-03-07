import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

type FooterPageData = {
  title: string;
  description: string;
  points: string[];
};

@Component({
  selector: 'app-footer-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer-page.component.html',
  styleUrls: ['./footer-page.component.scss']
})
export class FooterPageComponent {
  private readonly route = inject(ActivatedRoute);

  get pageData(): FooterPageData {
    const data = this.route.snapshot.data as Partial<FooterPageData>;
    return {
      title: data.title || 'Information',
      description: data.description || 'Details are available below.',
      points: data.points || []
    };
  }
}
