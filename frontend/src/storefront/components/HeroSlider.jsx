import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMoney } from '../utils';
import { ProductVisual } from './ProductTile';
import { HERO_BG, HERO_IMAGES } from '../heroImages';

function SlideVisual({ product, image, alt = '', side = 'left', variant = '' }) {
  if (image) {
    return (
      <div className={`af-slide-visual is-${side} is-${variant || 'photo'}`.trim()}>
        <img
          src={image}
          alt={alt}
          className={`af-slide-photo ${variant === 'cutout' ? 'is-cutout' : ''}`.trim()}
          loading="lazy"
        />
      </div>
    );
  }

  if (product) {
    return (
      <div className={`af-slide-visual is-${side}`.trim()}>
        <ProductVisual product={product} className="af-slide-product" />
      </div>
    );
  }

  return <div className={`af-slide-visual is-${side}`} aria-hidden />;
}

export default function HeroSlider({ products = [], fromPrice, currency = 'USD' }) {
  const { t } = useTranslation('storefront');
  const framed = products.slice(0, 6);
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
      bg: HERO_BG,
      leftImage: HERO_IMAGES.left,
      rightImage: HERO_IMAGES.right,
    },
    ...framed.slice(0, 3).map((product, i) => ({
      id: product.id,
      kicker: t('home.newestBadge'),
      title: product.name,
      body: product.shortDescription || t('hero.productBody'),
      cta: t('hero.shopNow'),
      to: `/product/${product.id}`,
      bg: HERO_BG,
      left: product,
      right: framed[(i + 1) % framed.length] || product,
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
          <article
            key={slide.id}
            className="af-slide"
            style={slide.bg ? { '--slide-bg': `url(${slide.bg})` } : undefined}
          >
            <div className="af-slide-bg" aria-hidden />
            <SlideVisual
              product={slide.left}
              image={slide.leftImage?.src}
              alt={slide.leftImage?.alt}
              variant={slide.leftImage?.variant}
              side="left"
            />
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
            <SlideVisual
              product={slide.right}
              image={slide.rightImage?.src}
              alt={slide.rightImage?.alt}
              variant={slide.rightImage?.variant}
              side="right"
            />
          </article>
        ))}
      </div>

      <div className="af-slider-ui">
        <div className="af-slider-dots-shell">
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
        </div>
        <div className="af-slider-arrows">
          <button type="button" className="af-slider-nav prev" onClick={() => go(-1)} aria-label="Previous">
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <button type="button" className="af-slider-nav next" onClick={() => go(1)} aria-label="Next">
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </section>
  );
}
