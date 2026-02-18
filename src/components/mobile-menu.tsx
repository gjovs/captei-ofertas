'use client';

import { useState } from 'react';
import { Menu, X, Tag, BookOpen, Home } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const navLinks = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/promocoes-do-dia', label: 'Promocoes do Dia', icon: Tag },
  { href: '/blog', label: 'Blog', icon: BookOpen },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle className="text-left text-orange-600 text-xl font-bold">
            Captei Ofertas
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8">
          <ul className="space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium"
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="absolute bottom-8 left-6 right-6">
          <p className="text-xs text-gray-400 text-center">
            As melhores ofertas em um so lugar
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
