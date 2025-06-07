# Turkey Radar Map

This repository contains a PHP Backend and a Next.js Frontend for displaying a radar map of Turkey. The map is interactive and allows users to view radar data in real-time.

## TODOS

- [ ] Add functionality for users to add points on the map
- [ ] Implement a feature to report incorrect points on the map (only users points)
- [ ] Improvement of the cities data bounds [cities.json](./data/cities.json)
- [ ] Add a feature user communication system (anonymous chat, filtered messages, user information is hosted in people's own browsers. [session, cookies, localStorage, etc.])

## LICENSE

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ramazansancar/turkey-radar-map.git
```

2. Navigate to the project directory:

```bash
cd turkey-radar-map
```

3. Install the dependencies: (make sure you have [pnpm](https://pnpm.io/) installed):

```bash
pnpm install
```

4. Start the development server:

```bash
pnpm dev
```

5. Open your browser and go to `http://localhost:3000` to view the application.

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: PHP (Cache, REST API)
- **Database**: -
- **Map**: Leaflet.js
