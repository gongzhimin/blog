import type { Site, SocialObjects } from "astro-paper/types";

export const SITE: Site = {
  website: "https://example.com",
  author: "Zhimin",
  desc: "Personal blog about tech, life, and everything in between",
  title: "Zhimin's Blog",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 10,
};

export const LOGO_IMAGE = {
  enable: true,
  svg: true,
  width: 64,
  height: 64,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/example",
    linkTitle: `${SITE.title} on Github`,
    active: true,
  },
];
