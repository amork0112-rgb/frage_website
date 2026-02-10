# FRAGE Mobile App

React Native mobile app for FRAGE English Academy built with Expo.

## Features

### Parent App
- ✅ Authentication with Supabase
- ✅ View student information
- ✅ Read notices from academy
- ✅ Submit commitments
- ✅ Push notifications
- ✅ Settings & logout

### Teacher App
- ✅ Authentication with Supabase
- ✅ View assigned classes
- ✅ View students in each class
- ✅ Send commitments to students
- ✅ Push notifications
- ✅ Settings & logout

## Prerequisites

- Node.js 18+ installed
- iOS Simulator (Mac only) or Android Emulator
- Expo account (for push notifications)
- Supabase project (already configured)

## Setup Instructions

### 1. Install Dependencies

```bash
cd frage-mobile
npm install
```

### 2. Configure Environment Variables

The `.env` file is already created with your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://atqhuikigklrafkhrvpk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create Device Tokens Table in Supabase

Run the SQL migration in your Supabase project:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase-migration.sql`
3. Execute the SQL to create the `device_tokens` table

### 4. Configure Expo Push Notifications

1. Sign up for Expo account at https://expo.dev
2. Create a new project in Expo dashboard
3. Copy your project ID
4. Update `lib/push.ts` line 35:
   ```typescript
   projectId: 'your-actual-project-id-here'
   ```

### 5. Run the App

**iOS (Mac only):**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Web (for testing):**
```bash
npm run web
```

## Project Structure

```
frage-mobile/
├── app/                       # Expo Router pages
│   ├── (parent)/             # Parent app screens (tab navigation)
│   │   ├── home.tsx          # Student info dashboard
│   │   ├── notices.tsx       # View notices
│   │   ├── commitments.tsx   # Submit commitments
│   │   └── settings.tsx      # Settings & logout
│   ├── (teacher)/            # Teacher app screens (tab navigation)
│   │   ├── home.tsx          # Teacher dashboard
│   │   ├── classes.tsx       # View classes & students
│   │   ├── send-commitments.tsx  # Send commitments
│   │   └── settings.tsx      # Settings & logout
│   ├── auth/
│   │   └── login.tsx         # Login screen
│   ├── _layout.tsx           # Root layout with auth listener
│   └── index.tsx             # Entry point (role detection)
├── lib/
│   ├── supabase.ts           # Supabase client config
│   ├── auth.ts               # Auth functions & role detection
│   └── push.ts               # Push notification functions
├── components/               # Shared UI components (future)
├── .env                      # Environment variables
└── app.json                  # Expo configuration
```

## Authentication Flow

1. **Login** → User enters credentials at `/auth/login`
2. **Role Detection** → `index.tsx` detects user role from database:
   - Check `teachers` table for teacher/admin roles
   - Check `students` table for parent role
3. **Redirect** → Based on role:
   - Teacher/Admin → `/(teacher)/home`
   - Parent → `/(parent)/home`

## Database Schema

The app uses your existing Supabase tables:

- `teachers` - Teacher accounts with roles
- `students` - Student records linked to parents
- `classes` - Class information
- `commitments` - Student commitments
- `notices` - Academy notices
- `device_tokens` - Push notification tokens (NEW)

## Push Notifications Setup

### Testing Push Notifications

1. Install Expo CLI globally:
   ```bash
   npm install -g expo-cli
   ```

2. Send a test push:
   ```bash
   expo push:send --to="ExponentPushToken[xxxxxx]"
   ```

### Production Push Notifications

For production, you'll need to:
1. Build native iOS/Android apps with EAS Build
2. Configure APNs (iOS) and FCM (Android) credentials
3. Use Expo's push notification service or your own server

Reference: https://docs.expo.dev/push-notifications/overview/

## Building for Production

### iOS

```bash
npx eas build --platform ios
```

### Android

```bash
npx eas build --platform android
```

## Known Limitations

1. **Push Notifications**: Requires physical device for testing (simulators have limited support)
2. **Expo Project ID**: Must be updated in `lib/push.ts` for push notifications to work
3. **Teacher Selection**: Currently shows all classes for the logged-in teacher

## Development Tips

- Use `npm start` to start the Metro bundler
- Press `i` for iOS simulator, `a` for Android emulator
- Use React Native Debugger or Flipper for debugging
- Check Expo logs with `npx expo start --dev-client`

## Deployment

### App Stores

1. **iOS App Store**: Requires Apple Developer account ($99/year)
2. **Google Play Store**: Requires Google Play Developer account ($25 one-time)

### EAS Build & Submit

```bash
# Configure EAS
npx eas build:configure

# Build for iOS
npx eas build --platform ios --profile production

# Build for Android
npx eas build --platform android --profile production

# Submit to stores
npx eas submit --platform ios
npx eas submit --platform android
```

## Troubleshooting

### "Metro bundler not starting"
```bash
npx expo start --clear
```

### "Supabase connection failed"
Check `.env` file and ensure Supabase URL and key are correct

### "Push notifications not working"
- Ensure you're testing on a physical device
- Verify Expo project ID is configured in `lib/push.ts`
- Check device_tokens table in Supabase

### "Module not found errors"
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

## Next Steps

- [ ] Add image uploads for student profiles
- [ ] Implement real-time updates with Supabase Realtime
- [ ] Add offline support with AsyncStorage
- [ ] Create admin dashboard screens
- [ ] Add analytics tracking
- [ ] Implement deep linking for notices

## Support

For issues or questions:
- Create an issue in the project repository
- Contact FRAGE tech team

---

Built with ❤️ using Expo & Supabase
