# Database Schema & API Reference

## Database Tables

### `profiles`
Stores user profile information.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, matches auth.users.id |
| `display_name` | VARCHAR(255) | Player's display name |
| `team_name` | VARCHAR(255) | Team name (shown on leaderboard) - UNIQUE |
| `stripe_customer_id` | VARCHAR(255) | Stripe customer reference |
| `subscription_status` | VARCHAR(50) | 'inactive', 'active', 'cancelled' |
| `created_at` | TIMESTAMP | Account creation date |

**Example:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "display_name": "John Doe",
  "team_name": "Arsenal United",
  "stripe_customer_id": "cus_123abc",
  "subscription_status": "active",
  "created_at": "2024-01-15T10:30:00"
}
```

---

### `seasons`
Represents a game season (e.g., "Premier League 2024-25").

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Season name |
| `start_date` | DATE | Season start |
| `end_date` | DATE | Season end |
| `is_active` | BOOLEAN | Only 1 active season at a time |
| `created_at` | TIMESTAMP | Creation date |

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446665440000",
  "name": "Premier League 2024-25",
  "start_date": "2024-08-01",
  "end_date": "2025-05-31",
  "is_active": true,
  "created_at": "2024-01-10T08:00:00"
}
```

---

### `match_days`
A round of games (e.g., gameweek 1, 2, 3, etc).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `season_id` | UUID | Foreign key to seasons |
| `match_date` | DATE | Date of matches |
| `cutoff_at` | TIMESTAMP | When predictions must be submitted by |
| `is_open` | BOOLEAN | False when scores are entered |
| `actual_total_goals` | INTEGER | Total goals scored by selected games |
| `created_at` | TIMESTAMP | Creation date |

**Example:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446665440001",
  "season_id": "550e8400-e29b-41d4-a716-446665440000",
  "match_date": "2024-08-17",
  "cutoff_at": "2024-08-17T12:30:00Z",
  "is_open": false,
  "actual_total_goals": 24,
  "created_at": "2024-08-15T09:00:00"
}
```

---

### `games`
Individual matches in a match day.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `match_day_id` | UUID | Foreign key to match_days |
| `home_team` | VARCHAR(255) | e.g., "Manchester United" |
| `away_team` | VARCHAR(255) | e.g., "Liverpool" |
| `kickoff_at` | TIMESTAMP | Match start time |
| `home_goals` | INTEGER | Final home score (set by admin) |
| `away_goals` | INTEGER | Final away score (set by admin) |
| `is_selected` | BOOLEAN | Are predictions for this game counted? |
| `created_at` | TIMESTAMP | Creation date |

**Example:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446665440002",
  "match_day_id": "660e8400-e29b-41d4-a716-446665440001",
  "home_team": "Manchester United",
  "away_team": "Liverpool",
  "kickoff_at": "2024-08-17T15:00:00Z",
  "home_goals": 2,
  "away_goals": 1,
  "is_selected": true,
  "created_at": "2024-08-15T09:00:00"
}
```

---

### `predictions`
Player's prediction for a match day's total goals.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to profiles |
| `match_day_id` | UUID | Foreign key to match_days |
| `predicted_total_goals` | INTEGER | Player's guess of total goals |
| `points` | INTEGER | 10 if correct, 0 if wrong |
| `created_at` | TIMESTAMP | Prediction submit time |

**Constraints:**
- UNIQUE(user_id, match_day_id) - One prediction per player per match day
- Predictions locked after match_day.cutoff_at

**Example:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446665440003",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "match_day_id": "660e8400-e29b-41d4-a716-446665440001",
  "predicted_total_goals": 24,
  "points": 10,
  "created_at": "2024-08-17T10:15:00"
}
```

---

## API Routes (To Be Built)

### `POST /api/auth/signin`
Sign in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "session": { "access_token": "...", "refresh_token": "..." },
  "user": { "id": "...", "email": "..." }
}
```

---

### `POST /api/auth/signup`
Create new account with team name.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "John Doe",
  "teamName": "Arsenal United"
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "..." },
  "profile": { "id": "...", "team_name": "Arsenal United" }
}
```

---

### `POST /api/predictions`
Submit or update a prediction.

**Request:**
```json
{
  "matchDayId": "660e8400-e29b-41d4-a716-446665440001",
  "predictedTotalGoals": 24
}
```

**Response:**
```json
{
  "prediction": {
    "id": "...",
    "predictedTotalGoals": 24,
    "points": null
  }
}
```

---

### `POST /api/create-checkout-session`
Create Stripe checkout session for subscription.

**Request:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response:**
```json
{
  "sessionUrl": "https://checkout.stripe.com/pay/cs_test_..."
}
```

---

### `POST /api/webhooks/stripe`
Webhook for Stripe events (subscription updates).

**Events handled:**
- `checkout.session.completed` - Update subscription_status to 'active'
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Mark subscription as 'cancelled'

---

### `POST /api/admin/create-season`
Admin: Create new season.

**Request:**
```json
{
  "name": "Premier League 2024-25",
  "startDate": "2024-08-01",
  "endDate": "2025-05-31"
}
```

**Response:**
```json
{
  "season": { "id": "...", "name": "Premier League 2024-25" }
}
```

---

### `POST /api/admin/create-matchday`
Admin: Create match day.

**Request:**
```json
{
  "seasonId": "550e8400-e29b-41d4-a716-446665440000",
  "matchDate": "2024-08-17",
  "cutoffAt": "2024-08-17T12:30:00Z"
}
```

**Response:**
```json
{
  "matchDay": { "id": "...", "seasonId": "..." }
}
```

---

### `POST /api/admin/add-game`
Admin: Add game to match day.

**Request:**
```json
{
  "matchDayId": "660e8400-e29b-41d4-a716-446665440001",
  "homeTeam": "Manchester United",
  "awayTeam": "Liverpool",
  "kickoffAt": "2024-08-17T15:00:00Z",
  "isSelected": true
}
```

**Response:**
```json
{
  "game": { "id": "...", "homeTeam": "Manchester United" }
}
```

---

### `POST /api/admin/enter-score`
Admin: Enter final score and auto-calculate points.

**Request:**
```json
{
  "gameId": "770e8400-e29b-41d4-a716-446665440002",
  "homeGoals": 2,
  "awayGoals": 1,
  "matchDayId": "660e8400-e29b-41d4-a716-446665440001"
}
```

**Process:**
1. Update game with final score
2. Calculate total goals from selected games
3. Update match_day.actual_total_goals
4. Calculate points for all predictions
5. Send email notifications for perfect scores

**Response:**
```json
{
  "matchDay": { "actualTotalGoals": 24, "isOpen": false },
  "pointsCalculated": 42,
  "perfectScores": 2
}
```

---

## Frontend Routes

| Route | Purpose | Auth Required | Subscription |
|-------|---------|---|---|
| `/` | Home/landing | ✗ | ✗ |
| `/signin` | Login | ✗ | ✗ |
| `/signup` | Register | ✗ | ✗ |
| `/dashboard` | Make predictions | ✓ | ✓ |
| `/leaderboard` | View standings | ✓ | ✗ |
| `/paywall` | Subscribe | ✓ | ✗ |
| `/admin` | Admin panel | ✓ (admin only) | ✗ |

---

## TypeScript Types

### Database Types

```typescript
// src/types/database.ts

export interface Profile {
  id: string;
  display_name: string;
  team_name: string;
  stripe_customer_id: string | null;
  subscription_status: 'inactive' | 'active' | 'cancelled';
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface MatchDay {
  id: string;
  season_id: string;
  match_date: string;
  cutoff_at: string;
  is_open: boolean;
  actual_total_goals: number | null;
  created_at: string;
}

export interface Game {
  id: string;
  match_day_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_goals: number | null;
  away_goals: number | null;
  is_selected: boolean;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_day_id: string;
  predicted_total_goals: number;
  points: number | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  team_name: string;
  total_points: number;
  predictions_count: number;
  rank?: number;
}
```

---

## Common Queries

### Get current season
```typescript
const { data } = await supabase
  .from('seasons')
  .select('*')
  .eq('is_active', true)
  .single();
```

### Get active match day
```typescript
const { data } = await supabase
  .from('match_days')
  .select('*')
  .eq('is_open', true)
  .order('match_date', { ascending: false })
  .limit(1)
  .single();
```

### Get games for match day
```typescript
const { data } = await supabase
  .from('games')
  .select('*')
  .eq('match_day_id', matchDayId)
  .eq('is_selected', true);
```

### Get player's prediction for match day
```typescript
const { data } = await supabase
  .from('predictions')
  .select('*')
  .eq('user_id', userId)
  .eq('match_day_id', matchDayId)
  .single();
```

### Get leaderboard standings
```typescript
const { data } = await supabase
  .from('predictions')
  .select('user_id, profiles(team_name), points')
  .not('points', 'is', null)
  .order('points', { ascending: false });
```

---

## Scoring Rules

- **Prediction Match:** 10 points
- **Prediction Wrong:** 0 points
- **Max per round:** 10 points
- **Season Score:** Sum of all match day scores
- **Leaderboard:** Sorted by total points descending

