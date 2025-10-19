import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Logo size="small" className="text-primary-foreground" />
          
          <div className="flex items-center gap-6 text-sm">
            <p>© 2025 IMPERIALcut. All rights reserved.</p>
            <button className="hover:text-accent transition-colors">
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
