export interface Product {
  id: string;
  group: "printer" | "copier" | "ink";
  badge: {
    label: string;
    tone: "success" | "info" | "warning";
    icon: string;
  };
  brand: string;
  name: string;
  blurb: string;
  specs: string[];
  rating: number;
  reviews: number;
  price: number;
  lease: number;
  icon: string;
  /** Product photo; falls back to an icon placeholder when absent. */
  image?: string;
  imageAlt?: string;
}
