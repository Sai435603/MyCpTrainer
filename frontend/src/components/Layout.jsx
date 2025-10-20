import Nav from "./Nav.jsx";
import "../styles/Layout.css";
export default function Layout({ children }) {
  return (
    <div className="app-layout">
        <Nav />
        <main>{children}</main>
    </div>
  );
}
