import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-root rowflex">
      <div className="colflex" id="picdiv">
        <span className="title">davisgroup.uk</span>
        <picture>
          <source srcSet="/va.avif" type="image/avif" />
          <img
            alt="Virginia the incredible cat."
            style={{ width: "80%", maxWidth: "600px" }}
            decoding="async"
            loading="lazy"
            src="/va.jpg"
          />
        </picture>
      </div>
      <div className="colflex" id="linkdiv">
        <a className="projlink" href="https://github.com/steve4650/">
          My Github
        </a>
        <Link className="projlink" to="/share-location">
          Share your location
        </Link>
        <div className="projlink">
          <a href="https://ip4.davisgroup.uk">ip4.davisgroup.uk</a>,{" "}
          <a href="https://ip6.davisgroup.uk">ip6.davisgroup.uk</a>
        </div>
        <Link className="projlink" to="/liturgical_calendar">
          Liturgical calendar
        </Link>
        <a className="projlink" href="/base64chat.html">
          Base64 Chat
        </a>
        <Link className="projlink" to="/freebee">
          FreeBee
        </Link>
        <a className="projlink" href="/photo-gallery">
          Photo gallery
        </a>
        <Link className="projlink" to="/chikorita">
          Sketch HTML + CSS
        </Link>
      </div>
    </div>
  );
}
