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
    <p className="package-shared-rate"><strong>{currency(pricePerShow)}</strong> per attended appointment <span>+ GST</span></p>
    <div className="presentation-packages">
      {[["Demo", 10], ["Starter", 20], ["Scale", 50]].map(([name, count]) => {
        const shows = Number(count);
        return <article key={name}>
          <h3>{name}</h3>
          <p className="package-count">{shows}</p>
          <p className="package-unit">attended appointments</p>
          <div className="package-total"><p>Total investment</p><strong>{currency(shows * pricePerShow)}</strong></div>
          <div className="package-revenue"><p>Est. procedure revenue</p><strong>{currency(shows * rate * caseValue)}</strong></div>
        </article>;
      })}
    </div>
    <p className="presentation-footnote">Investment excludes GST. Revenue assumes {convertRate} conversion at {currency(caseValue)} per procedure, before treatment costs.</p>
  </div></section>;
}

const FAQ_ITEMS = [
  { question: "What counts as a qualified show?", points: ["Attends your clinic", "Knows the procedure price", "Affordability checked", "Deposit paid"] },
  { question: "What if a patient doesn’t show?", answer: "You don’t pay." },
  { question: "Who covers the ad spend?", answer: "We cover the entire ad spend." },
  { question: "Which clinics have you worked with?", answer: "Clinics across Australia. Their names stay confidential, just as yours will." },
  { question: "How do I track appointments?", answer: "Your clinic portal shows upcoming appointments and remaining credits." },
  { question: "Where is your team?", answer: "Sydney, Australia." },
];

export function FaqSlide() {
  return <section className="deck-slide presentation-slide presentation-answers-slide"><SlideHeader /><div className="presentation-content">
    <Heading eyebrow="YOUR QUESTIONS">Clear answers before we start</Heading>
    <div className="presentation-answers">
      {FAQ_ITEMS.map(item => <article key={item.question}>
        <h3>{item.question}</h3>
        {item.points ? <ul>{item.points.map(point => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}</ul> : <p>{item.answer}</p>}
      </article>)}
    </div>
  </div></section>;
}
