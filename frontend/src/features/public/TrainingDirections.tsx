import { Plus } from 'lucide-react'
import { activityImages, homeCopy, type HomeLocale } from './home-content'

export function TrainingDirections({ locale }: { locale: HomeLocale }) {
  const copy = homeCopy[locale]
  return <section className="fp-shell fp-section fp-directions" id="club" tabIndex={-1} aria-labelledby="fp-directions-heading">
    <div className="fp-section-heading"><h2 id="fp-directions-heading">{copy.directions}</h2><p>{copy.directionsIntro}</p></div>
    <div className="fp-activity-grid">
      {copy.activities.map((activity, index) => <article className={`fp-activity fp-activity-${activity.id}`} key={activity.id}>
        <div className="fp-activity-image"><img src={activityImages[activity.id]} alt={activity.alt} width="900" height="600" loading="lazy" decoding="async" /></div>
        <div className="fp-activity-heading"><span aria-hidden="true">0{index + 1}</span><h3>{activity.title}</h3></div>
        <p className="fp-activity-intro">{activity.intro}</p>
        <p className="fp-activity-format">{activity.format}</p>
        <details><summary>{copy.more}<span className="sr-only">: {activity.title}</span><Plus size={17} aria-hidden="true" /></summary><p>{activity.detail}</p></details>
      </article>)}
    </div>
    <p className="fp-section-note">{copy.directionsNote}</p>
  </section>
}
