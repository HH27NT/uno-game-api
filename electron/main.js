const { app, BrowserWindow } = require('electron');
const { start } = require('../server');

let mainWindow;

const createWindow = (port) => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    title: 'UNO - Capstone',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}/app`);
};

app.whenReady().then(async () => {
  const { port } = await start();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
