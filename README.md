# Move App

Move is a house-hunting review and tracking application built with React Native and Expo. It allows users to easily track properties they visit, rate them based on customizable criteria, attach photos, and view all properties on an interactive map.

## Features

- **Customizable Review Fields**: Create custom fields (score, tags, address, sqft, price, boolean, etc.) to tailor the review process to your specific needs.
- **Map View**: View all your reviewed properties on a map to understand location contexts.
- **Filtering & Sorting**: Easily filter your properties by any custom field or tags to find the best match.
- **Cross-device Sync**: Built-in offline-first data sync using Firebase, allowing you to share a sync key and access your reviews across multiple devices.
- **Import/Export**: Easily backup or share your data with JSON import and export options.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the app**
   ```bash
   npx expo start
   ```

   In the output, you'll find options to open the app in a development build, Android emulator, iOS simulator, or Expo Go.

## Development

The project uses file-based routing with [Expo Router](https://docs.expo.dev/router/introduction).
- `src/app/`: Contains the screens and file-based routing logic.
- `src/components/`: Reusable UI components.
- `src/store/`: State management and data sync logic (Firebase + AsyncStorage).
- `src/theme/`: Shared styling, colors, and typography.
- `src/utils/`: Helper utilities.

### Setup Steps for Development
- **Linting**: To ensure code quality, you can run `npm run lint`.
- **Firebase Configuration**: The app connects to Firebase for its data sync. Check `src/store/firebase.ts` for configuration details.

## Learn More
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
