// Ported from the Legal app (family-law-floater/src/components/marketing/prominent-home-conversion.tsx). Re-run the port script to refresh.
import { ArrowUpRight, Check, ArrowRight, Clock3, UserCheck, ShieldCheck } from "lucide-react";
import consultationImage from "@/legal/assets/meeting-room.jpg";
import { DISCOVERY_BOOKING_URL } from "@/legal/lib/marketing-tracking";

export function HomeBenefits() {
  return (
    <section className="ph-home-benefits" aria-label="What changes for your business">
      <div className="prominent-container">
        <div>
          <Clock3 aria-hidden="true" />
          <div>
            <strong>Time back</strong>
            <span>We handle the chasing</span>
          </div>
        </div>
        <div>
          <UserCheck aria-hidden="true" />
          <div>
            <strong>Prepared prospects</strong>
            <span>Needs &amp; budget vetted</span>
          </div>
        </div>
        <div>
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Pay for attendance</strong>
            <span>No show. No appointment charge.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeBusinessValue() {
  return (
    <section className="ph-home-value" aria-labelledby="ph-home-value-title">
      <div className="prominent-container">
        <h2 id="ph-home-value-title">
          <span>Run the numbers</span> to see what this could add to your business.
        </h2>
        <a href="/calculator" className="prominent-button">
          Run my numbers <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function HomeMetrics() {
  return (
    <dl className="ph-home-team-metrics" aria-label="The Prominent operation">
      <div>
        <dt>Calls every month</dt>
        <dd>
          1,000<span>s</span>
        </dd>
      </div>
      <div>
        <dt>Discovery &amp; vetting</dt>
        <dd>
          30–50<span> min</span>
        </dd>
      </div>
      <div>
        <dt>Show rate</dt>
        <dd>
          80<span>%</span>
        </dd>
      </div>
    </dl>
  );
}

export function HomeReadiness() {
  return (
    <section className="ph-home-readiness" aria-labelledby="ph-home-readiness-title">
      <div className="prominent-container ph-home-readiness-grid">
        <div className="ph-home-readiness-copy">
          <span className="ph-home-kicker">QUALIFICATION BEFORE CONSULTATION</span>
          <h2 id="ph-home-readiness-title">
            Prepared to meet you.
            <br />
            <span>Not just booked in.</span>
          </h2>
          <ul>
            <li>
              <Check size={17} aria-hidden="true" /> Needs and financial readiness checked
            </li>
            <li>
              <Check size={17} aria-hidden="true" /> Likely costs explained
            </li>
            <li>
              <Check size={17} aria-hidden="true" /> Deposit collected
            </li>
          </ul>
          <a href="/how-it-works" className="prominent-text-link">
            Inside our vetting process <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="ph-home-consultation-image">
          <img
            src={consultationImage}
            alt="A professional consultation in a meeting room"
            width={1024}
            height={1536}
            loading="lazy"
            decoding="async"
          />
          <div className="ph-home-consultation-ready">
            <UserCheck size={20} aria-hidden="true" />
            <span>
              <strong>Ready for consultation</strong>
              <small>The groundwork is done.</small>
            </span>
          </div>
        </div>
        <HomeMetrics />
      </div>
    </section>
  );
}

export function HomeClosing() {
  return (
    <section className="ph-home-closing" aria-labelledby="ph-home-closing-title">
      <div className="prominent-container">
        <div>
          <h2 id="ph-home-closing-title">
            Let’s put your
            <br />
            <span>growth on the calendar.</span>
          </h2>
          <p>One conversation to see whether Prominent is the right fit for your business.</p>
        </div>
        <div className="ph-home-call-card">
          <h3>Your discovery call</h3>
          <ul>
            <li>
              <Check size={16} /> Who you want to work with
            </li>
            <li>
              <Check size={16} /> How many consultations you can take
            </li>
            <li>
              <Check size={16} /> What the numbers could look like
            </li>
          </ul>
          <a
            className="prominent-button"
            href={DISCOVERY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Book a discovery call <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
