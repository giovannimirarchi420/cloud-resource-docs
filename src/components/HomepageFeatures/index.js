import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Backend Service',
    Svg: require('@site/static/img/backend.svg').default,
    description: (
      <>
        The <strong>reservation-be</strong> backend service handles all business logic,
        API endpoints, and database operations for resource management and reservations.
      </>
    ),
  },
  {
    title: 'Frontend Application',
    Svg: require('@site/static/img/frontend.svg').default,
    description: (
      <>
        The <strong>reservation-fe</strong> React frontend provides an intuitive
        user interface for managing cloud resources, creating reservations, and configuring webhooks.
      </>
    ),
  },
  {
    title: 'Event Processing',
    Svg: require('@site/static/img/events.svg').default,
    description: (
      <>
        The <strong>reservation-event-processor</strong> microservice handles asynchronous
        event processing and webhook integrations for seamless resource automation.
      </>
    ),
  },
  {
    title: 'Webhook Integration',
    Svg: require('@site/static/img/webhook.svg').default,
    description: (
      <>
        Powerful <strong>webhook system</strong> enables seamless integration with external services,
        automated resource provisioning, and real-time event notifications for enhanced workflow automation.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--6 col--lg-3')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
