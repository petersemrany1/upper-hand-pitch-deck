import SlideHeader from "./SlideHeader";
import "./pitch-presentation.css";

function Heading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return <header className="presentation-heading"><p>{eyebrow}</p><h2>{children}</h2></header>;
}

export function PatientSlide() {
  return <section className="deck-slide presentation-slide"><SlideHeader /><div className="presentation-content">
    <Heading eyebrow="THE PATIENT">Who we’ll be sending you</Heading>
    <div className="patient-qualities">
      {[
        ["01", "Financially ready", "Knows the procedure price before the consult."],
        ["02", "Ready to move", "Has paid a deposit to attend your clinic."],
        ["03", "Decided it’s time", "We uncover their motivation and share it with you."],
      ].map(([number, title, description]) => <div key={number}><span className="presentation-number">{number}</span><h3>{title}</h3><p>{description}</p></div>)}
    </div>
  </div></section>;
}

export function PostConsultSlide() {
  return <section className="deck-slide presentation-slide"><SlideHeader /><div className="presentation-content">
    <Heading eyebrow="AFTER THE CONSULT">Didn’t book on the day?</Heading>
    <div className="consult-followup">
      {[
        ["01", "We follow up until they’re ready"],
        ["02", "We work through their questions"],
        ["03", "We keep the relationship intact"],
      ].map(([number, title]) => <div key={number}><span className="presentation-number">{number}</span><h3>{title}</h3></div>)}
    </div>
  </div></section>;
}

const currency = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);

export function PackagesSlide({ caseValue, rate, convertRate, pricePerShow }: { caseValue: number; rate: number; convertRate: string; pricePerShow: number }) {
  return <section className="deck-slide presentation-slide presentation-packages-slide"><SlideHeader /><div className="presentation-content">
    <Heading eyebrow="PACKAGES">Choose your patient volume</Heading>
    <div className="presentation-packages">
      {[["Demo", 10], ["Starter", 20], ["Scale", 50]].map(([name, count]) => {
        const shows = Number(count);
        return <article key={name}>
          <h3>{name}</h3>
          <p className="package-count">{shows}</p>
          <p className="package-unit">attended appointments</p>
          <p className="package-rate"><strong>{currency(pricePerShow)}</strong> per appointment</p>
          <div className="package-total"><p>Total investment</p><strong>{currency(shows * pricePerShow)}</strong></div>
          <div className="package-revenue"><p>Est. procedure revenue</p><strong>{currency(shows * rate * caseValue)}</strong></div>
        </article>;
      })}
    </div>
    <p className="presentation-footnote">Investment excludes GST. Revenue assumes {convertRate} conversion at {currency(caseValue)} per procedure, before treatment costs.</p>
  </div></section>;
}

export function FaqSlide() {
  return <section className="deck-slide presentation-slide"><SlideHeader /><div className="presentation-content">
    <Heading eyebrow="YOUR QUESTIONS">Clear answers before we start</Heading>
    <div className="presentation-faq">
      {[
        ["What if a patient doesn’t show?", "You don’t pay."],
        ["What if you can’t deliver the leads?", "We refund your investment in full."],
        ["Which clinics have you worked with?", "Clinics across Australia. Their names are confidential, just as yours will be."],
        ["What counts as a qualified appointment?", "A patient who attends your clinic, knows the price, has passed an affordability check and has paid a deposit."],
        ["Where is your team?", "Sydney, Australia."],
        ["How do I track my appointments?", "Your clinic portal keeps your upcoming appointments and remaining credits in one place."],
      ].map(([question, answer]) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}
    </div>
  </div></section>;
}
