import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
	await page.goto('/');
	await page.getByText('Login').click();

	await page.waitForURL('https://discord.com/login');
	await page.getByLabel('E-Mail oder Telefonnummer').fill('username');
	await page.getByLabel('Passwort').fill('password');
	await page.getByText('Anmelden').click();

	await page.waitForURL('/app/clearance');
	await page.context().storageState({ path: authFile });
});
