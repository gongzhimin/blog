import type { Site, SocialObjects } from "astro-paper/types";

export const SITE: Site = {
  website: "https://example.com",
  author: "Blog Author",
  desc: "Personal blog with life and tech articles",
  title: "My Blog",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 10,
};

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/example",
    linkTitle: `${SITE.title} on Github`,
    active: true,
  },
];
