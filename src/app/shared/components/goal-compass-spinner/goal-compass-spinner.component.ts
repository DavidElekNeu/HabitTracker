import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { GoalCompassProfile } from '../../services/goal-compass.service';

@Component({
  selector: 'app-goal-compass-spinner',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <section class="compass-shell" [class.compass-shell--intro]="mode === 'intro'">
      <div class="compass-stage">
        <div class="atmosphere"></div>

        <svg class="compass-svg" viewBox="0 0 240 240" aria-hidden="true">
          <circle class="ring-main" cx="120" cy="120" r="90"></circle>
          <circle class="ring-inner" cx="120" cy="120" r="58"></circle>

          <g class="tick-layer">
            <line
              *ngFor="let angle of tickAngles; let i = index"
              class="tick"
              [class.tick--major]="i % 3 === 0"
              [style.--i]="i"
              [attr.transform]="'rotate(' + angle + ' 120 120)'"
              x1="120"
              y1="23"
              x2="120"
              y2="33"
            ></line>
          </g>

          <g class="connection-layer">
            <line class="connection connection--why" x1="120" y1="120" x2="43" y2="120"></line>
            <line class="connection connection--goal" x1="120" y1="120" x2="120" y2="43"></line>
            <line class="connection connection--vision" x1="120" y1="120" x2="197" y2="120"></line>
            <line class="connection connection--next" x1="120" y1="120" x2="120" y2="197"></line>
          </g>
        </svg>

        <div class="needle-wrap">
          <div class="needle"></div>
          <div class="needle-tail"></div>
        </div>

        <div class="center-dot"></div>

        <span class="anchor anchor--goal">Goal</span>
        <span class="anchor anchor--why">Why</span>
        <span class="anchor anchor--vision">Vision</span>
        <span class="anchor anchor--next">Next</span>
      </div>

      <div class="caption" [class.caption--values]="mode !== 'intro' || !!profile">
        <ng-container *ngIf="mode === 'intro' && !profile; else valueBlock">
          <h3>Finding Direction</h3>
          <p>Goal. Why. Vision. Next.</p>
        </ng-container>

        <ng-template #valueBlock>
          <h3>Compass Values</h3>
          <p class="caption-row caption-row--goal"><strong>Goal:</strong> {{ profile?.goalName || '-' }}</p>
          <p class="caption-row caption-row--why"><strong>Why:</strong> {{ profile?.why || '-' }}</p>
          <p class="caption-row caption-row--vision"><strong>Vision:</strong> {{ profile?.vision || '-' }}</p>
          <p class="caption-row caption-row--next"><strong>Next:</strong> {{ profile?.nextStep || '-' }}</p>
        </ng-template>
      </div>
    </section>
  `,
  styles: [
    `
      .compass-shell {
        --tone-0: #120c07;
        --tone-1: #2a1b10;
        --tone-2: #6f4627;
        --tone-3: #b37a47;
        --tone-4: #f2d8b1;
        --total: 4.8s;

        display: grid;
        justify-items: center;
        align-content: center;
        gap: 1rem;
        width: 100vw;
        min-height: 100vh;
        min-width: 18rem;
        padding: calc(2rem + env(safe-area-inset-top)) 1.4rem calc(1.4rem + env(safe-area-inset-bottom));
        opacity: 1;
        animation: shell-out 0.8s ease-in-out 5.9s forwards;
      }

      .compass-stage {
        position: relative;
        width: 15rem;
        height: 15rem;
        margin-top: 0.8rem;
        opacity: 0;
        transform: scale(0.96);
        animation: scene-in 0.6s ease-out forwards;
      }

      .atmosphere {
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        background: radial-gradient(circle, rgba(186, 122, 60, 0.24), rgba(18, 12, 7, 0) 66%);
        filter: blur(9px);
        opacity: 0;
        animation: atmosphere-in 0.6s ease-out 0.06s forwards, atmosphere-float 4.4s ease-in-out 0.6s infinite;
      }

      .compass-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .ring-main {
        fill: none;
        stroke: rgba(194, 136, 73, 0.88);
        stroke-width: 1.35;
        stroke-linecap: round;
        stroke-dasharray: 565;
        stroke-dashoffset: 565;
        filter: drop-shadow(0 0 6px rgba(187, 131, 71, 0.22));
        animation: ring-draw 0.8s ease-out 0.6s forwards;
      }

      .ring-inner {
        fill: none;
        stroke: rgba(216, 171, 112, 0.58);
        stroke-width: 0.95;
        stroke-dasharray: 365;
        stroke-dashoffset: 365;
        animation: ring-draw-inner 0.6s ease-out 0.92s forwards;
      }

      .tick {
        stroke: rgba(247, 224, 189, 0.52);
        stroke-width: 1;
        stroke-linecap: round;
        opacity: 0;
        animation: tick-in 0.2s ease-out forwards;
        animation-delay: calc(0.9s + (var(--i) * 0.02s));
      }

      .tick--major {
        stroke-width: 1.8;
        stroke: rgba(255, 238, 209, 0.82);
      }

      .needle-wrap {
        position: absolute;
        inset: 1.7rem;
        border-radius: 9999px;
        transform: rotate(-20deg);
        animation:
          needle-align 0.8s cubic-bezier(0.2, 0.92, 0.22, 1) 1.4s forwards,
          needle-idle 4s ease-in-out 2.2s infinite;
      }

      .needle,
      .needle-tail {
        position: absolute;
        left: 50%;
        border-radius: 999px;
        transform: translateX(-50%) scaleY(0);
        transform-origin: 50% 100%;
        animation: needle-grow 0.34s ease-out 1.42s forwards;
      }

      .needle {
        top: 3%;
        width: 0.28rem;
        height: 45%;
        background: linear-gradient(to bottom, #f0be84 0%, #cb7535 44%, rgba(242, 211, 171, 0.88) 100%);
        box-shadow: 0 0 8px rgba(198, 136, 72, 0.42);
      }

      .needle-tail {
        bottom: 8%;
        width: 0.2rem;
        height: 28%;
        background: linear-gradient(to top, rgba(250, 232, 205, 0.75), rgba(157, 94, 40, 0.55));
      }

      .center-dot {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 1rem;
        height: 1rem;
        transform: translate(-50%, -50%) scale(0.85);
        border-radius: 999px;
        background: #f7e3c3;
        box-shadow:
          0 0 0 4px rgba(198, 137, 71, 0.24),
          0 0 0 8px rgba(160, 99, 44, 0.12);
        opacity: 0;
        animation:
          center-in 0.22s ease-out 1.12s forwards,
          center-pulse 0.58s ease-out 3.5s 1 forwards;
      }

      .anchor {
        position: absolute;
        display: inline-block;
        font-size: 0.95rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        color: rgba(248, 231, 203, 0.95);
        opacity: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .anchor--goal {
        left: 50%;
        top: -0.9rem;
        max-width: 11.5rem;
        text-align: center;
        transform: translate(-50%, -12px) scale(0.95);
        animation: word-goal 0.62s cubic-bezier(0.2, 0.84, 0.22, 1) 2.5s forwards;
      }

      .anchor--why {
        left: -1.9rem;
        top: 50%;
        max-width: 7.2rem;
        text-align: right;
        transform: translate(-14px, -50%) scale(0.95);
        animation: word-why 0.62s cubic-bezier(0.2, 0.84, 0.22, 1) 2.2s forwards;
      }

      .anchor--vision {
        right: -2.1rem;
        top: 50%;
        max-width: 7.2rem;
        text-align: left;
        transform: translate(14px, -50%) scale(0.95);
        animation: word-vision 0.62s cubic-bezier(0.2, 0.84, 0.22, 1) 2.8s forwards;
      }

      .anchor--next {
        left: 50%;
        bottom: -0.95rem;
        max-width: 11.5rem;
        text-align: center;
        transform: translate(-50%, 12px) scale(0.95);
        animation: word-next 0.62s cubic-bezier(0.2, 0.84, 0.22, 1) 3.1s forwards;
      }

      .connection {
        fill: none;
        stroke: rgba(231, 188, 130, 0.72);
        stroke-width: 1.1;
        stroke-linecap: round;
        stroke-dasharray: 100;
        stroke-dashoffset: 100;
        opacity: 0;
      }

      .connection--why {
        animation: connection-draw 0.34s ease-out 3.4s forwards, connection-pulse 0.7s ease-out 3.78s forwards;
      }

      .connection--goal {
        animation: connection-draw 0.34s ease-out 3.53s forwards, connection-pulse 0.7s ease-out 3.91s forwards;
      }

      .connection--vision {
        animation: connection-draw 0.34s ease-out 3.66s forwards, connection-pulse 0.7s ease-out 4.04s forwards;
      }

      .connection--next {
        animation: connection-draw 0.34s ease-out 3.79s forwards, connection-pulse 0.7s ease-out 4.17s forwards;
      }

      .caption {
        max-width: 20rem;
        text-align: center;
        opacity: 0;
        transform: translateY(6px);
        animation: caption-in 0.55s ease-out 3s forwards;
      }

      .caption--values {
        width: min(30rem, 95vw);
        max-width: min(30rem, 95vw);
        margin-inline: auto;
        text-align: center;
      }

      .caption h3 {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 700;
        color: #f8e8cb;
        letter-spacing: 0.01em;
      }

      .caption p {
        margin: 0.34rem 0 0;
        font-size: 0.8rem;
        color: rgba(245, 225, 193, 0.9);
        letter-spacing: 0.02em;
      }

      .caption-row {
        margin: 0.32rem 0 0;
        font-size: 1.03rem;
        line-height: 1.26;
        color: rgba(247, 229, 199, 0.96);
        opacity: 0;
        transform: translateY(8px);
        animation: row-in 0.48s ease-out forwards;
      }

      .caption-row--goal {
        animation-delay: 3.45s;
      }

      .caption-row--why {
        animation-delay: 3.9s;
      }

      .caption-row--vision {
        animation-delay: 4.35s;
      }

      .caption-row--next {
        animation-delay: 4.8s;
      }

      .caption-row strong {
        color: rgba(255, 244, 225, 0.98);
      }

      @keyframes scene-in {
        from {
          opacity: 0;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes atmosphere-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes atmosphere-float {
        0%,
        100% {
          transform: scale(0.96);
        }
        50% {
          transform: scale(1.05);
        }
      }

      @keyframes ring-draw {
        from {
          stroke-dashoffset: 565;
          opacity: 0.35;
        }
        to {
          stroke-dashoffset: 0;
          opacity: 1;
        }
      }

      @keyframes ring-draw-inner {
        from {
          stroke-dashoffset: 365;
          opacity: 0.3;
        }
        to {
          stroke-dashoffset: 0;
          opacity: 0.95;
        }
      }

      @keyframes tick-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes needle-grow {
        from {
          transform: translateX(-50%) scaleY(0);
          opacity: 0.2;
        }
        to {
          transform: translateX(-50%) scaleY(1);
          opacity: 1;
        }
      }

      @keyframes needle-align {
        0% {
          transform: rotate(-20deg);
        }
        36% {
          transform: rotate(318deg);
        }
        72% {
          transform: rotate(192deg);
        }
        88% {
          transform: rotate(186deg);
        }
        100% {
          transform: rotate(180deg);
        }
      }

      @keyframes needle-idle {
        0%,
        100% {
          transform: rotate(180deg);
        }
        50% {
          transform: rotate(182deg);
        }
      }

      @keyframes center-in {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.82);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      @keyframes center-pulse {
        0% {
          transform: translate(-50%, -50%) scale(1);
          box-shadow:
            0 0 0 4px rgba(198, 137, 71, 0.24),
            0 0 0 8px rgba(160, 99, 44, 0.12);
        }
        55% {
          transform: translate(-50%, -50%) scale(1.15);
          box-shadow:
            0 0 0 8px rgba(226, 172, 108, 0.24),
            0 0 0 14px rgba(176, 113, 52, 0.16);
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          box-shadow:
            0 0 0 4px rgba(198, 137, 71, 0.24),
            0 0 0 8px rgba(160, 99, 44, 0.12);
        }
      }

      @keyframes word-why {
        from {
          opacity: 0;
          transform: translate(-14px, -50%) scale(0.95);
          letter-spacing: 0;
        }
        to {
          opacity: 1;
          transform: translate(0, -50%) scale(1);
          letter-spacing: 0.03em;
        }
      }

      @keyframes word-goal {
        from {
          opacity: 0;
          transform: translate(-50%, -12px) scale(0.95);
          letter-spacing: 0;
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0) scale(1);
          letter-spacing: 0.03em;
        }
      }

      @keyframes word-vision {
        from {
          opacity: 0;
          transform: translate(14px, -50%) scale(0.95);
          letter-spacing: 0;
        }
        to {
          opacity: 1;
          transform: translate(0, -50%) scale(1);
          letter-spacing: 0.03em;
        }
      }

      @keyframes word-next {
        from {
          opacity: 0;
          transform: translate(-50%, 12px) scale(0.95);
          letter-spacing: 0;
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0) scale(1);
          letter-spacing: 0.03em;
        }
      }

      @keyframes connection-draw {
        from {
          opacity: 0;
          stroke-dashoffset: 100;
        }
        to {
          opacity: 0.95;
          stroke-dashoffset: 0;
        }
      }

      @keyframes connection-pulse {
        0% {
          opacity: 0.95;
          stroke: rgba(231, 188, 130, 0.72);
        }
        50% {
          opacity: 1;
          stroke: rgba(253, 220, 172, 0.98);
        }
        100% {
          opacity: 0.9;
          stroke: rgba(234, 196, 140, 0.74);
        }
      }

      @keyframes caption-in {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes shell-out {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.98);
        }
      }

      @keyframes row-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 460px) {
        .compass-stage {
          width: 13.2rem;
          height: 13.2rem;
          margin-top: 1rem;
        }

        .caption {
          max-width: 16.5rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .compass-shell,
        .compass-stage,
        .atmosphere,
        .ring-main,
        .ring-inner,
        .tick,
        .needle-wrap,
        .needle,
        .needle-tail,
        .center-dot,
        .anchor,
        .connection,
        .caption {
          animation: none !important;
          opacity: 1 !important;
        }

        .ring-main,
        .ring-inner,
        .connection {
          stroke-dashoffset: 0 !important;
        }

        .needle-wrap {
          transform: rotate(180deg) !important;
        }

        .needle,
        .needle-tail {
          transform: translateX(-50%) scaleY(1) !important;
        }

        .anchor--goal {
          transform: translate(-50%, 0) scale(1) !important;
        }

        .anchor--why {
          transform: translate(0, -50%) scale(1) !important;
        }

        .anchor--vision {
          transform: translate(0, -50%) scale(1) !important;
        }

        .anchor--next {
          transform: translate(-50%, 0) scale(1) !important;
        }

        .caption {
          transform: translateY(0) !important;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalCompassSpinnerComponent {
  @Input() mode: 'intro' | 'motivation' = 'motivation';
  @Input() profile: GoalCompassProfile | null = null;

  readonly tickAngles = Array.from({ length: 24 }, (_, i) => i * 15);
}
