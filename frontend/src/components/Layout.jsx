import "../styles/Layout.css";
export default function Layout({ children }) {
  return (
    <div className="app-layout">
        <main>{children}</main>
    </div>
  );
}
