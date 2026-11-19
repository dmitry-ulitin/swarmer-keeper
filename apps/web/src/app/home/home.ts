import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HealthService } from '@swarmer-keeper/api-client';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, map, of } from 'rxjs';

export type ApiStatus = 'loading' | 'ok' | 'down';

@Component({
  selector: 'sk-home',
  imports: [TuiBadge],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly health = inject(HealthService);

  readonly status = toSignal(
    this.health.getHealth().pipe(
      map((): ApiStatus => 'ok'),
      catchError(() => of<ApiStatus>('down')),
    ),
    { initialValue: 'loading' as ApiStatus },
  );
}
