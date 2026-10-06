export {};

declare global {
  interface Window {
    /** Site-owned, private plugin integration; not a workspace package API. */
    SiteReader: {
      TurnAdapter: {
        create(options: object): {
          mount(): boolean;
          clampPageTarget(book: unknown, page: number): number;
        };
        paperCropForPage(page: number): { x: number; y: number };
      };
    };
  }
}
