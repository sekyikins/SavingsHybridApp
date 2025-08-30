# Daily Savings Tracker

A responsive React TypeScript web application for tracking daily savings habits in Cedis (GHS) with a clean, mobile-first interface built using React, TypeScript, TailwindCSS, and Supabase.

## Features

- **User Authentication**: Secure login/signup with email and password
- **Multi-User Support**: Each user has their own private savings data
- **Daily Savings Recording**: Mark days as saved and enter amounts in Cedis (GHS)
- **Statistics Dashboard**: View today's status, weekly totals, and overall savings
- **Interactive Calendar**: Color-coded calendar showing savings history
- **Date Navigation**: Browse through different weeks
- **Edit Functionality**: Click any calendar date to edit savings data
- **Mobile-First Design**: Optimized for mobile devices with simple, clean UI
- **Real-time Updates**: All data syncs instantly with Supabase backend
- **Data Security**: Row Level Security ensures users only see their own data

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. In your Supabase dashboard, go to the SQL Editor
3. Run the SQL setup script from `database-setup.sql` to create the savings table with user authentication:

```sql
-- Create savings table with user authentication
CREATE TABLE IF NOT EXISTS savings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    amount FLOAT DEFAULT 0,
    saved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- Enable Row Level Security for user data isolation
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure users only see their own data
CREATE POLICY "Users can only see their own savings" ON savings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own savings" ON savings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

4. Enable Authentication in Supabase:
   - Go to Authentication > Settings
   - Enable Email authentication
   - Configure your site URL (e.g., `http://localhost:3000` for development)

5. Get your project URL and anon key from Settings > API

### 2. Application Setup

1. Clone or download this project
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with your Supabase credentials:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: The application uses Vite, so environment variables must be prefixed with `VITE_` to be accessible in the client-side code.

4. Start the development server:
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### 3. Building for Production

To create a production build:

```bash
npm run build
```

This creates a `build` folder with optimized files ready for deployment.

## Usage

### Getting Started
1. Sign up with your email and password
2. Check your email for confirmation (if required)
3. Sign in to access your personal savings tracker

### Recording Daily Savings
1. Check the "Saved today" checkbox if you saved money today
2. Enter the amount you saved in Cedis (GHS)
3. Click "Save" to record your savings

### Viewing Statistics
- **Today's Status**: Shows if you've saved today and the amount
- **This Week**: Total amount saved in the current week
- **Total Saved**: Your all-time savings total

### Using the Calendar
- **Green days**: Days when you saved money
- **Red days**: Days when you didn't save (but have a record)
- **Gray days**: Days with no record
- **Blue border**: Today's date
- Click any date to edit that day's savings record

### Navigation
- Use "Previous Week" and "Next Week" buttons to browse different time periods
- The calendar automatically updates to show the selected week

## File Structure

```
Savings-Web-App/
├── public/
│   └── index.html      # HTML template
├── src/
│   ├── components/     # React components
│   │   ├── TodaysSavings.tsx
│   │   ├── Statistics.tsx
│   │   ├── Calendar.tsx
│   │   ├── EditModal.tsx
│   │   └── MessageDisplay.tsx
│   ├── hooks/
│   │   └── useSavings.ts    # Custom hook for Supabase operations
│   ├── lib/
│   │   └── supabase.ts      # Supabase client configuration
│   ├── types/
│   │   └── supabase.ts      # TypeScript type definitions
│   ├── utils/
│   │   ├── currency.ts      # Currency formatting (Cedis)
│   │   └── dateUtils.ts     # Date utility functions
│   ├── App.tsx         # Main App component
│   └── index.tsx       # React entry point
├── .env                # Environment variables
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Technologies Used

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe JavaScript for better development experience
- **TailwindCSS**: Utility-first CSS framework for styling
- **Supabase**: Backend-as-a-Service for database and real-time features
- **React Scripts**: Build tooling and development server

## Browser Compatibility

This application works in all modern browsers that support:
- ES6+ JavaScript features
- CSS Grid and Flexbox
- Fetch API

## Security Notes

- The Supabase anon key is safe to use in client-side code
- Consider implementing Row Level Security (RLS) policies in Supabase for production use
- For multi-user applications, integrate Supabase Auth for user authentication

## Customization

### Styling
- Modify TailwindCSS classes in React components to change the appearance
- Add custom CSS in `public/index.html` for global styles
- The design is mobile-first and optimized for small screens

### Functionality
- Edit React components in `src/components/` to modify UI behavior
- Update `src/hooks/useSavings.ts` for Supabase operations
- Add new utility functions in `src/utils/`
- The code is fully typed with TypeScript for better development experience

## Troubleshooting

### Common Issues

1. **Authentication not working**: 
   - Verify email authentication is enabled in Supabase
   - Check that your site URL is configured correctly
   - Ensure you've run the database setup SQL

2. **Data not loading**: 
   - Check your Supabase URL and API key in `.env`
   - Verify the savings table exists with the correct schema
   - Check browser console for RLS policy errors

3. **Build errors**: 
   - Make sure all dependencies are installed with `npm install`
   - Check TypeScript errors in the terminal

4. **Database table missing**: 
   - Run the complete SQL script from `database-setup.sql` in Supabase SQL Editor
   - Verify RLS policies are created correctly

### Error Messages
The app includes built-in error handling that will display helpful messages for common issues.

## Contributing

Feel free to fork this project and submit pull requests for improvements!

## License

This project is open source and available under the MIT License.
