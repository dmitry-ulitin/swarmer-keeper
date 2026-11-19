import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HealthService, type HealthDto } from '@swarmer-keeper/api-client';
import { type Observable, of, Subject, throwError } from 'rxjs';
import { Home } from './home';

function render(response: Observable<HealthDto>) {
  TestBed.configureTestingModule({
    imports: [Home],
    providers: [{ provide: HealthService, useValue: { getHealth: () => response } }],
  });
  const fixture = TestBed.createComponent(Home);
  fixture.detectChanges();
  return { component: fixture.componentInstance, text: () => fixture.nativeElement.textContent };
}

describe('Home', () => {
  it('показывает «API: работает», когда health ответил ok', () => {
    const { component, text } = render(of({ status: 'ok' }));
    expect(component.status()).toBe('ok');
    expect(text()).toContain('API: работает');
  });

  it('показывает «API: недоступен», когда запрос к API упал', () => {
    const { component, text } = render(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(component.status()).toBe('down');
    expect(text()).toContain('API: недоступен');
  });

  it('показывает «Проверяем API…», пока ответа нет', () => {
    const { component, text } = render(new Subject<HealthDto>());
    expect(component.status()).toBe('loading');
    expect(text()).toContain('Проверяем API…');
  });
});
