<template>
  <div class="top-progress" :class="{ 'is-active': active }" aria-hidden="true">
    <div class="top-progress__bar"></div>
  </div>
</template>

<script setup>
defineProps({ active: { type: Boolean, default: false } });
</script>

<style scoped>
.top-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 10000;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.top-progress.is-active { opacity: 1; }

.top-progress__bar {
  position: absolute;
  top: 0;
  left: -30%;
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, var(--sys-primary-hover), var(--sys-primary));
  box-shadow: 0 0 8px var(--sys-primary);
}

.top-progress.is-active .top-progress__bar {
  animation: top-progress-slide 1.1s ease-in-out infinite;
}

@keyframes top-progress-slide {
  0%   { left: -30%; }
  100% { left: 100%; }
}
</style>
