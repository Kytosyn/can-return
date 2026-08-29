import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Scan", icon: "📷" },
  { to: "/nearby", label: "Nearby", icon: "📍" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Layout() {
  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto bg-gray-950">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-lg border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive
                    ? "text-brand-400 font-semibold"
                    : "text-gray-500 hover:text-gray-300"
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
