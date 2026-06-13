<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../application/authStore';
import AppIcon from './AppIcon.vue';

const auth = useAuthStore();

const email = ref('');
const passwort = ref('');

async function absenden() {
  await auth.anmelden(email.value, passwort.value);
}
</script>

<template>
  <div class="anmelde-seite">
    <form class="card anmelde-karte" @submit.prevent="absenden">
      <div class="anmelde-marke">
        <AppIcon name="kalender" :groesse="26" />
        Dienstplan
      </div>
      <p class="anmelde-hinweis">Bitte mit dem gemeinsamen Team-Zugang anmelden.</p>

      <div class="form-group">
        <label for="anmelde-email">E-Mail</label>
        <input
          id="anmelde-email"
          v-model="email"
          type="email"
          autocomplete="username"
          required
          :disabled="auth.beschaeftigt"
        />
      </div>

      <div class="form-group">
        <label for="anmelde-passwort">Passwort</label>
        <input
          id="anmelde-passwort"
          v-model="passwort"
          type="password"
          autocomplete="current-password"
          required
          :disabled="auth.beschaeftigt"
        />
      </div>

      <p v-if="auth.fehler" class="form-error" role="alert">{{ auth.fehler }}</p>

      <button class="btn btn-primary anmelde-knopf" type="submit" :disabled="auth.beschaeftigt">
        <AppIcon name="check" :groesse="16" />
        {{ auth.beschaeftigt ? 'Anmelden …' : 'Anmelden' }}
      </button>
    </form>
  </div>
</template>
