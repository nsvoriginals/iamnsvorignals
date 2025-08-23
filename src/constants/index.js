// index.js
export const servicesData = [
  {
    title: "FullStack Developer",
    description:
      "I love building stuff that actually works. From backend logic to shiny UIs, I put things together so they don’t just run — they scale. Think clean code, fast APIs, and frontends that feel buttery smooth.",
    items: [
      {
        title: "Backend Engineering",
        description: "(Node.js, Express, REST/GraphQL, Auth, Microservices)",
      },
      {
        title: "Frontend Magic",
        description: "(React, GSAP animations, TypeScript, Interactive UI/UX)",
      },
      {
        title: "Databases",
        description: "(MongoDB, Postgres, NoSQL/SQL tuning, scalable schemas)",
      },
    ],
  },
  {
    title: "DevOps & Cloud Stuff",
    description:
      "I mess with infra so you don’t have to. I containerize, automate, and ship apps to the cloud without the drama. Zero-to-prod, fast.",
    items: [
      {
        title: "CI/CD & Infra",
        description: "(Docker, GitHub Actions, Kubernetes basics)",
      },
      {
        title: "Servers & Scaling",
        description: "(Linux, Nginx, Load balancing, Caching tricks)",
      },
      {
        title: "Perf Tuning",
        description: "(Compression, Lighthouse 90+ scores, smoother builds)",
      },
    ],
  },
  {
    title: "Security & Optimization",
    description:
      "I don’t like slow apps or security holes. I patch, audit, and tweak code until it’s fast, safe, and production-ready.",
    items: [
      {
        title: "Code Reviews",
        description: "(Refactor, clean up tech debt)",
      },
      {
        title: "Pen Testing Basics",
        description: "(SQLi/XSS checks, Auth hardening, OAuth2)",
      },
      {
        title: "SEO Tech",
        description: "(SSR, metadata, structured data, better rankings)",
      },
    ],
  },
  {
    title: "Exploring New Tech",
    description:
      "I like to poke around new stacks and push boundaries — from crypto to systems programming. Right now I’m vibing with Rust, Solana, Web3 stuff, and Kubernetes.",
    items: [
      {
        title: "Rustacean Mode",
        description: "(Learning Rust for systems + web backends)",
      },
      {
        title: "Solana / Web3",
        description: "(Smart contracts, dApps, wallets, blockchain infra)",
      },
      {
        title: "Creative UI/UX",
        description: "(GSAP motion design, React + animations that pop)",
      },
    ],
  },
];

export const projects = [
  {
    id: 1,
    name: "ATLAS AI",
    description:
      "An AI powered career development platform to help aspirants get job ready.",
    href: "https://dash-one-henna.vercel.app/",
    image: "/assets/projects/atlas.png",
    bgImage: "/assets/backgrounds/blanket.jpg",
    frameworks: [
      { id: 1, name: "React" },
      { id: 2, name: "Framer" },
      { id: 3, name: "Node.js" },
      { id: 4, name: "GROQ" },
      { id: 5, name: "FastAPI" },
    ],
  },
  {
    id: 2,
    name: "STASH",
    description:
      "A web platform to organise all types of content without hassle.",
    href: "https://github.com/nsvoriginals/stash.git",
    image: "/assets/projects/image.png",
    bgImage: "/assets/backgrounds/curtains.jpg",
    frameworks: [
      { id: 1, name: "React" },
      { id: 2, name: "Next.js" },
      { id: 3, name: "Stripe API" },
      { id: 4, name: "Tailwind CSS" },
    ],
  },
  {
    id: 3,
    name: "Interactive Virtual Meet",
    description:
      "A metaverse-style app for online meetings and hangouts. Built with realtime multiplayer vibes.",
    href: "https://oasisclient.vercel.app/",
    image: "/assets/projects/oasis.png",
    bgImage: "/assets/backgrounds/poster.jpg",
    frameworks: [
      { id: 1, name: "React" },
      { id: 2, name: "Express" },
      { id: 3, name: "MongoDB" },
      { id: 4, name: "Colyseus + WebSockets" },
    ],
  },
  // {
  //   id: 4,
  //   name: "Digital Game Store",
  //   description:
  //     "A gaming platform with discounted titles, top sellers, and genre-based browsing.",
  //   href: "",
  //   image: "/assets/projects/game-store.jpg",
  //   bgImage: "/assets/backgrounds/curtains.jpg",
  //   frameworks: [
  //     { id: 1, name: "Svelte" },
  //     { id: 2, name: "Node.js" },
  //     { id: 3, name: "MongoDB" },
  //     { id: 4, name: "Chakra UI" },
  //   ],
  // },
];

export const socials = [
  { name: "Instagram", href: "https://www.instagram.com/nsvoriginals/" },
  { name: "Twitter", href: "https://x.com/SheshiVardhan34" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/sheshivardhan34/" },
  { name: "GitHub", href: "https://github.com/nsvoriginals" },
  { name: "Medium", href: "https://medium.com/@nsvoriginals" },
];
