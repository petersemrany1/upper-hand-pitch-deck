import { useState } from "react";
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
  { label: "If a patient doesn’t show", question: "What if a patient doesn’t show?", answer: "You don’t pay." },
  { label: "If we can’t deliver", question: "What if you can’t deliver the leads?", answer: "We refund your investment in full." },
  { label: "Our clinic experience", question: "Which clinics have you worked with?", answer: "Clinics across Australia. Their names are confidential, just as yours will be." },
  { label: "A qualified appointment", question: "What counts as a qualified appointment?", points: ["Attends your clinic", "Knows the procedure price", "Has passed an affordability check", "Has paid a deposit"] },
  { label: "Where we’re based", question: "Where is your team?", answer: "Sydney, Australia." },
  { label: "Tracking your appointments", question: "How do I track my appointments?", answer: "Your clinic portal keeps your upcoming appointments and remaining credits in one place." },
];

export function FaqSlide() {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const item = FAQ_ITEMS[activeQuestion];
  return <section className="deck-slide presentation-slide presentation-answers-slide"><SlideHeader /><div className="presentation-content">
    <Heading eyebrow="YOUR QUESTIONS">Clear answers before we start</Heading>
    <div className="presentation-answers">
      <div className="answer-topics" role="group" aria-label="Choose a question">
        {FAQ_ITEMS.map((question, index) => <button key={question.label} type="button" aria-pressed={index === activeQuestion} aria-controls="presentation-answer" onClick={() => setActiveQuestion(index)}>
          <span>{String(index + 1).padStart(2, "0")}</span>{question.label}
        </button>)}
      </div>
      <div className="answer-detail" id="presentation-answer" aria-live="polite" aria-atomic="true">
        <p className="answer-position">{String(activeQuestion + 1).padStart(2, "0")} / 06</p>
        <h3>{item.question}</h3>
        {item.points ? <ul>{item.points.map(point => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}</ul> : <p className="answer-copy">{item.answer}</p>}
      </div>
    </div>
  </div></section>;
}
