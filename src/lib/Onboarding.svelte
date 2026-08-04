<script lang="ts">
  import { Button, Card } from '@swal/ui';
  import { t } from './i18n/index.svelte';

  // We accept an ondismiss callback so the parent (App.svelte) can remove it from view
  let { ondismiss } = $props<{ ondismiss?: () => void }>();

  let currentStep = $state(0);

  const steps = [
    {
      title: "onboarding.welcome",
      description: "onboarding.step1",
    },
    {
      title: "onboarding.welcome",
      description: "onboarding.step2",
    },
    {
      title: "onboarding.welcome",
      description: "onboarding.step3",
    }
  ];

  function handleNext() {
    if (currentStep < steps.length - 1) {
      currentStep += 1;
    } else {
      dismiss();
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      currentStep -= 1;
    }
  }

  function dismiss() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nido_onboarding_seen', 'true');
    }
    if (ondismiss) {
      ondismiss();
    }
  }
</script>

<div class="onboarding-overlay" data-testid="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
  <div class="onboarding-card-wrapper">
    <Card>
      <div class="onboarding-content">
        <h2 id="onboarding-title" class="title">{t(steps[currentStep].title)}</h2>

        <div class="step-body">
          <p class="description">{t(steps[currentStep].description)}</p>
        </div>

        <div class="footer-controls">
          <div class="dots-container" aria-label="Step progress">
            {#each steps as _, index}
              <button
                class="step-dot"
                class:active={index === currentStep}
                aria-label={`Go to step ${index + 1}`}
                onclick={() => (currentStep = index)}
                data-testid={`onboarding-dot-${index}`}
              ></button>
            {/each}
          </div>

          <div class="button-group">
            {#if currentStep > 0}
              <Button variant="ghost" size="sm" onclick={handlePrev}>
                {t('onboarding.prev')}
              </Button>
            {/if}

            <Button variant="primary" size="sm" onclick={handleNext} data-testid="onboarding-next">
              {currentStep === steps.length - 1 ? t('onboarding.dismiss') : t('onboarding.next')}
            </Button>

            <Button variant="secondary" size="sm" onclick={dismiss} data-testid="onboarding-dismiss">
              {t('onboarding.dismiss')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </div>
</div>

<style>
  .onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(2, 6, 23, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
    backdrop-filter: blur(4px);
  }

  .onboarding-card-wrapper {
    width: 100%;
    max-width: 460px;
  }

  .onboarding-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 8px;
  }

  .title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--swal-text, #f1f5f9);
  }

  .step-body {
    min-height: 80px;
    display: flex;
    align-items: center;
  }

  .description {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--swal-text-secondary, #94a3b8);
  }

  .footer-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-top: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
    padding-top: 16px;
  }

  .dots-container {
    display: flex;
    gap: 8px;
  }

  .step-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--swal-border, rgba(255, 255, 255, 0.15));
    border: none;
    cursor: pointer;
    padding: 0;
    transition: background 0.25s ease;
  }

  .step-dot.active {
    background: var(--swal-accent, #06b6d4);
  }

  .button-group {
    display: flex;
    gap: 8px;
    align-items: center;
  }
</style>
