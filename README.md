# GamePredict - AI-Powered Football Game Predictions

A modern, responsive football game prediction website built with Next.js, TypeScript, and Material UI components.

## Features

- **Real-time Predictions**: AI-powered predictions for 1000+ matches daily
- **Probability Analysis**: Win/draw/loss probabilities with confidence scores
- **Odds Display**: Current betting odds from major bookmakers
- **Form Analysis**: Team form tracking (last 5 matches)
- **Predicted Scores**: AI-generated predicted match scores
- **Expert Recommendations**: Best pick suggestions based on analysis
- **Responsive Design**: Fully responsive Material UI components
- **Modern Dashboard**: Professional dashboard-style interface

## Tech Stack

- **Framework**: Next.js 15.2
- **Language**: TypeScript
- **UI Library**: Material UI (MUI)
- **Styling**: Emotion (MUI's styling engine)
- **Icons**: Material Icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd GamePredict
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with Material UI theme
│   └── page.tsx            # Main home page
├── components/
│   ├── GameCard.tsx        # Individual game prediction card
│   ├── Header.tsx          # Navigation header
│   ├── StatsBar.tsx        # Statistics and filters
│   ├── Footer.tsx          # Footer section
│   └── index.ts            # Component exports
└── types/
    └── game.ts             # TypeScript game data types
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Data Structure

### Game Interface
```typescript
interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: Date;
  league: string;
  predictions: Prediction;
  odds: Odds;
  status: 'upcoming' | 'live' | 'completed';
}
```

### Prediction Interface
```typescript
interface Prediction {
  homeWinProb: number;        // 0-100
  drawProb: number;           // 0-100
  awayWinProb: number;        // 0-100
  predictedScore: {
    home: number;
    away: number;
  };
  confidence: number;         // 0-100
  recommendation: 'home' | 'away' | 'draw' | 'over' | 'under';
}
```

## Customization

### Theme Colors
Edit the theme in `src/app/layout.tsx`:
```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});
```

### Mock Data
Update mock games in `src/app/page.tsx` with real API data:
```typescript
const mockGames: Game[] = [
  // Your game data here
];
```

## API Integration

To integrate with a real backend:

1. Create an API client in `src/lib/api.ts`
2. Fetch games data instead of using mock data
3. Update component props as needed

## Future Enhancements

- [ ] Live score updates
- [ ] User authentication and profiles
- [ ] Betting slip creation
- [ ] Historical prediction tracking
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] Real-time notifications
- [ ] Social features (tips sharing)

## Disclaimer

This application is for entertainment and educational purposes only. Always gamble responsibly and within your means. The predictions are based on historical data and statistical models, not guaranteed outcomes.

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or feature requests, please contact the development team.

---

Built with ❤️ for football fans
