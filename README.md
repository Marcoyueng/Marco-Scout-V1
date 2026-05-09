# VEX Robotics Scouting Platform

A comprehensive VEX Robotics scouting platform with team statistics, event information, skills rankings, and match history. Built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Team Lookup**: Search and explore VEX Robotics teams with detailed statistics
- **Event Search**: Find tournaments and events worldwide
- **Skills Rankings**: Global skills challenge leaderboard
- **Team Profiles**: Comprehensive team statistics and performance history
- **Event Details**: Complete event information with matches and rankings
- **Team Comparison**: Side-by-side team analysis
- **Match History**: Detailed match records and results
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **API**: RobotEvents API v2

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vex-scouting
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Add your RobotEvents API token to `.env.local`:
   ```
   ROBOTEVENTS_API_TOKEN=your_api_token_here
   ```
   
   To get an API token:
   - Visit [RobotEvents API](https://www.robotevents.com/api/v2)
   - Create an account and generate an API token
   - Add the token to your `.env.local` file

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (server-side only)
│   │   ├── teams/         # Team data endpoints
│   │   ├── events/        # Event data endpoints
│   │   └── skills/        # Skills data endpoints
│   ├── teams/             # Team pages
│   ├── events/            # Event pages
│   ├── skills/            # Skills rankings page
│   ├── compare/           # Team comparison page
│   ├── search/            # Search page
│   └── ...               # Other pages
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui components
│   └── navigation.tsx     # Main navigation
├── lib/                  # Utility functions and API client
│   ├── robotevents.ts     # RobotEvents API integration
│   └── utils.ts          # Helper functions
└── types/                # TypeScript type definitions
    └── robotevents.ts     # API data structures
```

## API Integration

The application uses the RobotEvents API v2 to fetch VEX Robotics data:

- **Teams**: Team information, statistics, and performance history
- **Events**: Tournament details, schedules, and results
- **Skills**: Global skills challenge rankings and scores
- **Matches**: Match records and alliance information

All API calls are made server-side through Next.js API routes to protect your API token.

## Key Features

### Team Profiles
- Complete team information (name, organization, location)
- Performance statistics (win rate, average score, highest score)
- Skills scores (driver, programming, total)
- Match history with alliance information
- Awards and achievements
- Partner and opponent history

### Event Details
- Event information and schedule
- Team registrations and rankings
- Match results and elimination brackets
- Skills standings and awards

### Skills Rankings
- Global leaderboard for all skills categories
- Filter by program, season, grade level, and region
- Sort by total, driver, or programming skills
- Pagination support for large datasets

### Team Comparison
- Compare 2-4 teams side by side
- Skills scores comparison
- Win rate and performance metrics
- Recent event comparison
- Visual charts and analysis

## Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Environment Variables for Production

Make sure to set the `ROBOTEVENTS_API_TOKEN` environment variable in your production environment.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page on GitHub
2. Verify your RobotEvents API token is correctly configured
3. Ensure you're using the correct Node.js version (18+)

## Acknowledgments

- [RobotEvents](https://www.robotevents.com) for providing the comprehensive VEX Robotics API
- [VEX Robotics](https://www.vexrobotics.com) for the amazing robotics competition platform
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
