import { Link } from "@tanstack/react-router";
import logoIcon from "@/assets/logo-icon.png";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logoIcon} alt="Share CoreMar" className="h-9 w-9 rounded-lg" />
            <span className="font-bold">Share CoreMar</span>
          </div>
          <p className="text-sm text-muted-foreground">Smart Market. Core Solutions.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Marketplace</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/products">All Products</Link></li>
            <li><Link to="/categories">Categories</Link></li>
            <li><Link to="/brands">Brands</Link></li>
            <li><Link to="/suppliers">Suppliers</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Business</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/become-supplier">Become a Supplier</Link></li>
            <li><Link to="/wholesale">Wholesale</Link></li>
            <li><Link to="/retail">Retail</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Contact</li>
            <li>Help Center</li>
            <li>Terms & Privacy</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Share CoreMar. All rights reserved.
      </div>
    </footer>
  );
}
