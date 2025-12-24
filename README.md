# 🚗 Buggy Shuttle - GPS Takip Sistemi

Otel/resort buggy araçları için gerçek zamanlı GPS takip ve çağrı yönetim sistemi.

## 🌟 Özellikler

- 📍 Gerçek zamanlı araç takibi (Traccar entegrasyonu)
- 📞 Durak bazlı çağrı sistemi
- 🗺️ MapLibre ile interaktif harita
- 📱 PWA desteği (sürücü uygulaması)
- 🔄 Otomatik GPS düzeltme (rota snap)
- 📊 Raporlama ve istatistikler

## 🚀 Hızlı Başlangıç

### Docker ile (Önerilen)

```bash
# Clone
git clone https://github.com/your-repo/buggy-shuttle.git
cd buggy-shuttle

# Environment variables
cp .env.example .env
# Edit .env with your values

# Start
docker-compose up -d
```

Uygulama: http://localhost:3000

### Manuel Kurulum

```bash
# Dependencies
npm install

# Database
npm run db:push
npm run db:seed

# Development
npm run dev
```

## 🔧 Environment Variables

| Variable                | Description                  | Default            |
| ----------------------- | ---------------------------- | ------------------ |
| `DATABASE_URL`          | PostgreSQL connection string | -                  |
| `TRACCAR_URL`           | Traccar server URL           | -                  |
| `TRACCAR_USER`          | Traccar username             | -                  |
| `TRACCAR_PASSWORD`      | Traccar password             | -                  |
| `PUBLIC_APP_NAME`       | Application name             | Lujo Buggy Shuttle |
| `PUBLIC_MAP_CENTER_LAT` | Map center latitude          | 37.1385641         |
| `PUBLIC_MAP_CENTER_LNG` | Map center longitude         | 27.5607023         |

## 📱 PWA Sürücü Uygulaması

Sürücüler için GPS tracker: `/driver`

- Traccar'a OsmAnd protokolü ile konum gönderir
- Wake Lock ile ekran açık kalır
- Ana ekrana eklenebilir

## 🏗️ Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, TailwindCSS
- **Backend**: SvelteKit API routes
- **Database**: PostgreSQL + Drizzle ORM
- **Maps**: MapLibre GL
- **GPS**: Traccar integration

## 📁 Proje Yapısı

```
buggy-shuttle/
├── src/
│   ├── lib/
│   │   ├── components/    # UI components
│   │   ├── server/        # Server-side code
│   │   │   ├── db/        # Database schema & queries
│   │   │   └── traccar.ts # Traccar API client
│   │   └── stores/        # Svelte stores
│   └── routes/
│       ├── api/           # API endpoints
│       ├── driver/        # PWA GPS tracker
│       ├── settings/      # Settings pages
│       └── ...
├── static/                # Static assets
├── drizzle/               # Database migrations
└── docker-compose.yml     # Docker configuration
```

## 🐳 Coolify Deployment

1. GitHub'a push et
2. Coolify'da yeni proje oluştur
3. Docker Compose seç
4. Environment variables ekle
5. Deploy!

## 📄 License

MIT
