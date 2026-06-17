import daBoiAvatar from "../client/static/da-boi.webp";
import kivo from "../client/static/examples/kivo.webp";
import messync from "../client/static/examples/messync.webp";
import microinfluencerClub from "../client/static/examples/microinfluencers.webp";
import promptpanda from "../client/static/examples/promptpanda.webp";
import reviewradar from "../client/static/examples/reviewradar.webp";
import scribeist from "../client/static/examples/scribeist.webp";
import searchcraft from "../client/static/examples/searchcraft.webp";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [

export const features: GridFeature[] = [
  {
    name: "Cool Feature 1",
    description: "Your feature",
    emoji: "🤝",
    href: "/features",
    size: "small",
  },
  {
    name: "Cool Feature 2",
    description: "Feature description",
    emoji: "🔐",
    href: "/features",
    size: "small",
  },
  {
    name: "Cool Feature 3",
    description: "Describe your cool feature here",
    emoji: "🥞",
    href: "/features",
    size: "medium",
  },
  {
    name: "Cool Feature 4",
    description: "Describe your cool feature here",
    emoji: "💸",
    href: "/features",
    size: "large",
  },
  {
    name: "Cool Feature 5",
    description: "Describe your cool feature here",
    emoji: "💼",
    href: "/features",
    size: "large",
  },
  {
    name: "Cool Feature 6",
    description: "It is cool",
    emoji: "📈",
    href: "/features",
    size: "small",
  },
  {
    name: "Cool Feature 7",
    description: "Cool feature",
    emoji: "📧",
    href: "/features",
    size: "small",
  },
  {
    name: "Cool Feature 8",
    description: "Describe your cool feature here",
    emoji: "🤖",
    href: "/features",
    size: "medium",
  },
  {
    name: "Cool Feature 9",
    description: "Describe your cool feature here",
    emoji: "🚀",
    href: "/features",
    size: "medium",
  },
];

export const testimonials = [
  {
    name: "Da Boi",
    role: "Wasp Mascot",
    avatarSrc: daBoiAvatar,
    socialUrl: "https://twitter.com/wasplang",
    quote: "I don't even know how to code. I'm just a plushie.",
  },
  {
    name: "Mr. Foobar",
    role: "Founder @ Cool Startup",
    avatarSrc: daBoiAvatar,
    socialUrl: "",
    quote: "This product makes me cooler than I already am.",
  },
  {
    name: "Jamie",
    role: "Happy Customer",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "My cats love it!",
  },
];

export const faqs = [
  {
    id: 1,
    question: "How does the AI chat widget work?",
    answer: "Add a single script tag to your website. The widget automatically loads and engages visitors with AI-powered responses based on your knowledge base.",
    href: "/faq",
  },
  {
    id: 2,
    question: "Which AI providers do you support?",
    answer: "We support OpenAI (GPT-4o, GPT-4o-mini) and Google Gemini (Gemini 1.5 Pro, Flash, 2.5 Pro). You can configure your preferred provider in settings.",
    href: "/faq",
  },
  {
    id: 3,
    question: "Can I customize the widget appearance?",
    answer: "Yes! Customize colors, position, title, avatar, and welcome message. On Pro plans, remove our branding and add your own logo.",
    href: "/faq",
  },
  {
    id: 4,
    question: "How does human handoff work?",
    answer: "When AI fails or a visitor requests a human, conversations are escalated automatically. Team members get email notifications and can reply from the inbox.",
    href: "/faq",
  },
];

export const footerNavigation = {
  app: [
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQ", href: "/faq" },
    { name: "Blog", href: "/blog" },
    { name: "Documentation", href: "/docs/installation" },
  ],
  company: [
    { name: "Contact", href: "/contact" },
    { name: "Privacy", href: "#" },
    { name: "Terms of Service", href: "#" },
  ],
};

export const examples = [
  {
    name: "Example #1",
    description: "Describe your example here.",
    imageSrc: kivo,
    href: "#",
  },
  {
    name: "Example #2",
    description: "Describe your example here.",
    imageSrc: messync,
    href: "#",
  },
  {
    name: "Example #3",
    description: "Describe your example here.",
    imageSrc: microinfluencerClub,
    href: "#",
  },
  {
    name: "Example #4",
    description: "Describe your example here.",
    imageSrc: promptpanda,
    href: "#",
  },
  {
    name: "Example #5",
    description: "Describe your example here.",
    imageSrc: reviewradar,
    href: "#",
  },
  {
    name: "Example #6",
    description: "Describe your example here.",
    imageSrc: scribeist,
    href: "#",
  },
  {
    name: "Example #7",
    description: "Describe your example here.",
    imageSrc: searchcraft,
    href: "#",
  },
];
