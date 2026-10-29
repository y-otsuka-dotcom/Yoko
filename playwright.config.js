import {defineConfig,devices} from '@playwright/test';
import {existsSync} from 'node:fs';

const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
export default defineConfig({
  testDir:'./tests/browser',
  timeout:30000,
  fullyParallel:true,
  workers:2,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:4175/Yoko/',headless:true,launchOptions:{executablePath,args:['--no-sandbox']},trace:'retain-on-failure'},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
  webServer:{command:'npm run preview -- --port 4175 --outDir docs --base /Yoko/',url:'http://127.0.0.1:4175/Yoko/',reuseExistingServer:false,timeout:20000},
});
