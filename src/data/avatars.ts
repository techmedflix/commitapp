export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  url: string;
}

export const PERSONALITY_AVATARS: AvatarOption[] = [
  {
    id: 'avatar-astronaut',
    name: 'Astronaut Dev',
    emoji: '🚀',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Astronaut&backgroundColor=b6e3f4',
  },
  {
    id: 'avatar-ninja',
    name: 'Code Ninja',
    emoji: '🥷',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ninja&backgroundColor=c0aede',
  },
  {
    id: 'avatar-cat',
    name: 'Cyber Cat',
    emoji: '🐱',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberCat&backgroundColor=ffd5dc',
  },
  {
    id: 'avatar-founder',
    name: 'Tech Founder',
    emoji: '🕶️',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Founder&backgroundColor=d1d4f9',
  },
  {
    id: 'avatar-designer',
    name: 'Creative Designer',
    emoji: '🎨',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Designer&backgroundColor=ffdfbf',
  },
  {
    id: 'avatar-coffee',
    name: 'Espresso Engineer',
    emoji: '☕',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Espresso&backgroundColor=c0aede',
  },
  {
    id: 'avatar-fox',
    name: 'Clever Fox',
    emoji: '🦊',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Fox&backgroundColor=ffd5dc',
  },
  {
    id: 'avatar-pm',
    name: 'Product Leader',
    emoji: '👑',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Leader&backgroundColor=b6e3f4',
  },
  {
    id: 'avatar-music',
    name: 'Beatmaker Hacker',
    emoji: '🎧',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Hacker&backgroundColor=d1d4f9',
  },
  {
    id: 'avatar-scientist',
    name: 'Quantum Researcher',
    emoji: '⚡',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum&backgroundColor=ffdfbf',
  },
  {
    id: 'avatar-wizard',
    name: 'Pixel Wizard',
    emoji: '🥑',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Wizard&backgroundColor=b6e3f4',
  },
  {
    id: 'avatar-lion',
    name: 'Executive Lion',
    emoji: '🦁',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Lion&backgroundColor=ffd5dc',
  },
];
