import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-app-launch-intro',
  standalone: true,
  template: `
    <section class="launch-root" aria-hidden="true">
      <div class="launch-noise"></div>
      <div class="launch-halo launch-halo--outer"></div>
      <div class="launch-halo launch-halo--inner"></div>

      <p class="launch-title">Habit Tracker</p>
      <p class="launch-tagline">Small actions. Compounded daily.</p>
    </section>
  `,
  styles: [
    `
      .launch-root {
        position: fixed;
        inset: 0;
        z-index: 150;
        display: grid;
        place-items: center;
        overflow: hidden;
        background:
          radial-gradient(110% 70% at 50% 12%, rgba(212, 160, 23, 0.22), rgba(18, 12, 7, 0)),
          linear-gradient(160deg, #120c07 0%, #1b1209 42%, #2b1c10 100%);
      }

      .launch-noise {
        position: absolute;
        inset: 0;
        opacity: 0.06;
        background-image:
          linear-gradient(transparent 97%, rgba(255, 255, 255, 0.22) 100%),
          linear-gradient(90deg, transparent 97%, rgba(255, 255, 255, 0.2) 100%);
        background-size: 8px 8px, 8px 8px;
        animation: noise-drift 4s linear infinite;
      }

      .launch-halo {
        position: absolute;
        border-radius: 999px;
        border: 1px solid rgba(255, 224, 180, 0.55);
      }

      .launch-halo--outer {
        width: 22rem;
        height: 22rem;
        animation: halo-outer 1.7s ease-out infinite;
      }

      .launch-halo--inner {
        width: 14rem;
        height: 14rem;
        animation: halo-inner 1.7s ease-out infinite;
      }

      .launch-title {
        margin: 0.2rem 0 0;
        position: relative;
        z-index: 2;
        font-size: 1.38rem;
        letter-spacing: 0.06em;
        font-weight: 700;
        color: #f8e5c3;
        text-transform: uppercase;
        animation: title-in 0.65s ease-out;
      }

      .launch-tagline {
        margin: 0.35rem 0 0;
        position: relative;
        z-index: 2;
        font-size: 0.8rem;
        letter-spacing: 0.04em;
        color: rgba(248, 229, 195, 0.86);
        animation: title-in 0.8s ease-out;
      }

      @keyframes halo-outer {
        0% {
          transform: scale(0.88);
          opacity: 0.52;
        }
        100% {
          transform: scale(1.04);
          opacity: 0;
        }
      }

      @keyframes halo-inner {
        0% {
          transform: scale(0.76);
          opacity: 0.64;
        }
        100% {
          transform: scale(1);
          opacity: 0;
        }
      }

      @keyframes title-in {
        0% {
          opacity: 0;
          transform: translateY(7px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes noise-drift {
        from {
          transform: translate(0, 0);
        }
        to {
          transform: translate(8px, 8px);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .launch-noise,
        .launch-halo,
        .launch-title,
        .launch-tagline {
          animation: none !important;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLaunchIntroComponent {}
