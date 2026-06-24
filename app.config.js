const { execSync } = require('child_process');
const packageJson = require('./package.json');

let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Could not read git hash');
}

module.exports = {
  "expo": {
    "name": "move-app",
    "slug": "move-app",
    "version": packageJson.version,
    "orientation": "portrait",
    "icon": "./assets/images/icon-transparent.png",
    "scheme": "moveapp",
    "userInterfaceStyle": "automatic",
    "web": {
      "output": "static",
      "favicon": "./assets/images/icon-transparent.png",
      "name": "Move App",
      "shortName": "Move",
      "display": "standalone",
      "themeColor": "#121212",
      "backgroundColor": "#121212"
    },
    "plugins": [
      "expo-router",
      "expo-sharing"
    ],
    "experiments": {
      "baseUrl": "/move-app",
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "version": packageJson.version,
      "gitHash": gitHash,
      "eas": {
        "projectId": "e87861b1-f9f4-473f-b0fb-a78eb0fe1dfd"
      }
    }
  }
};
