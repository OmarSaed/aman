import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMoney, mediaUrl } from '../utils';

function SlideVisual({ src }) {
  if (src) {
    return (
      <div className="af-slide-visual">
        <img src={src} alt="" />
      </div>
    );
  }
  return (
    <div className="af-slide-visual">
      <div className="af-slide-mark" aria-hidden>
        <b>AF</b>
        <span>Wholesale</span>
      </div>
    </div>
  );
}

export default function HeroSlider({ products = [], fromPrice, currency = 'USD' }) {
  const { t } = useTranslation('storefront');
  const framed = products.filter((p) => p.imageUrl).slice(0, 6);
  const leftImg = framed[0] ? mediaUrl(framed[0].imageUrl) : null;
  const rightImg = framed[1] ? mediaUrl(framed[1].imageUrl) : leftImg;
  const priceLabel = fromPrice != null ? formatMoney(fromPrice, currency) : '';

  const slides = [
    {
      id: 'brand',
      kicker: t('hero.kicker'),
      title: t('hero.title'),
      price: priceLabel,
      body: t('hero.body'),
      cta: t('hero.cta'),
      to: '/catalog',
      cta2: t('hero.ctaAlt'),
      to2: '/categories',
      left: leftImg,
      right: rightImg,
    },
    ...framed.slice(0, 3).map((product, i) => ({
      id: product.id,
      kicker: t('home.newestBadge'),
      title: product.name,
      body: product.shortDescription || t('hero.productBody'),
      cta: t('hero.shopNow'),
      to: `/product/${product.id}`,
      left: mediaUrl(product.imageUrl),
      right: framed[(i + 1) % framed.length]
        ? mediaUrl(framed[(i + 1) % framed.length].imageUrl)
        : mediaUrl(product.imageUrl),
    })),
  ];

  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const deltaX = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [slides.length]);

  const go = (dir) => setIndex((i) => (i + dir + slides.length) % slides.length);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };
  const onTouchMove = (e) => {
    deltaX.current = e.touches[0].clientX - startX.current;
  };
  const onTouchEnd = () => {
    if (deltaX.current > 50) go(-1);
    if (deltaX.current < -50) go(1);
  };

  return (
    <section className="um-hero" aria-label="Highlights">
      <div
        className="af-slider-track"
        style={{ transform: `translateX(${-index * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((slide) => (
          <article key={slide.id} className="af-slide">
            <SlideVisual src={slide.left} />
            <div className="af-slide-copy">
              <span className="af-pill">{slide.kicker}</span>
              <h2>{slide.title}</h2>
              <p className="um-from">
                {slide.price ? (
                  <>
                    {t('hero.fromLabel')} <b>{slide.price}</b>
                  </>
                ) : slide.body}
              </p>
              <div className="sf-hero-ctas">
                <Link className="af-btn" to={slide.to}>{slide.cta}</Link>
                {slide.to2 && <Link className="af-btn ghost" to={slide.to2}>{slide.cta2}</Link>}
              </div>
            </div>
            <SlideVisual src={slide.right} />
          </article>
        ))}
      </div>
      <button type="button" className="af-slider-nav prev" onClick={() => go(-1)} aria-label="Previous">
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="af-slider-nav next" onClick={() => go(1)} aria-label="Next">
        <ChevronRight size={18} />
      </button>
      <div className="af-slider-dots">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={i === index ? 'is-on' : ''}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
