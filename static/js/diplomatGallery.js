// Diplomat Gallery Slider functionality
class DiplomatGallery {
    constructor() {
        this.currentSlide = 0;
        this.slidesPerView = this.calculateSlidesPerView();
        this.diplomats = [
            {
                name: "Bettino Ricasoli",
                title: "Italian Statesman",
                image: "/static/images/diplomats/Bettino Ricasoli.jpg"
            },
            {
                name: "Cardinal Pietro Gianelli",
                title: "Catholic Cardinal",
                image: "/static/images/diplomats/Cardinal Pietro Gianelli.jpeg"
            },
            {
                name: "Count of Cavour Camillo Benso",
                title: "Italian Statesman",
                image: "/static/images/diplomats/Count of Cavour Camillo Benso.jpg"
            },
            {
                name: "Count of Salmour Ruggiero Gabaleone",
                title: "Italian Diplomat",
                image: "/static/images/diplomats/Count of Salmour Ruggiero Gabaleone.jpeg"
            },
            {
                name: "Domenico Carutti",
                title: "Italian Diplomat",
                image: "/static/images/diplomats/Domenico Carutti.jpg"
            },
            {
                name: "Keçecizade Mehmed Fuad Pasha",
                title: "Ottoman Statesman",
                image: "/static/images/diplomats/Keçecizade Mehmed Fuad Pasha.jpg"
            },
            {
                name: "Luigi Amedeo Melegari",
                title: "Italian Diplomat",
                image: "/static/images/diplomats/Luigi Amedeo Melegari.jpeg"
            },
            {
                name: "Mahmud Nedim Pasha",
                title: "Ottoman Grand Vizier",
                image: "/static/images/diplomats/Mahmud Nedim Pasha.jpeg"
            },
            {
                name: "Mehmed Emin Âli Pasha",
                title: "Ottoman Grand Vizier",
                image: "/static/images/diplomats/Mehmed_Emin_Âli_Paşa_1856-1.3R_V01R-1.1.1_BNF_cropped_and_rotated.jpg"
            },
            {
                name: "Mehmed Esad Safvet Pasha",
                title: "Ottoman Statesman",
                image: "/static/images/diplomats/Mehmed Esad Safvet Pasha.jpeg"
            },
            {
                name: "Rüstem Mariani Bey",
                title: "Ottoman Diplomat",
                image: "/static/images/diplomats/Rüstem Mariani Bey (later Pasha).jpeg"
            },
            {
                name: "Sigmund Spitzer",
                title: "Austrian Diplomat",
                image: "/static/images/diplomats/Sigmund Spitzer jpeg.jpeg"
            }
        ];
        
        this.init();
    }

    calculateSlidesPerView() {
        if (window.innerWidth <= 480) return 1;
        if (window.innerWidth <= 768) return 2;
        if (window.innerWidth <= 1024) return 3;
        return 4;
    }

    init() {
        this.renderGallery();
        this.setupEventListeners();
        this.updateNavigation();
        this.updateDots();
    }

    renderGallery() {
        const gallery = document.getElementById('diplomat-gallery');
        const dotsContainer = document.getElementById('gallery-dots');
        
        if (!gallery) return;

        // Clear existing content
        gallery.innerHTML = '';
        dotsContainer.innerHTML = '';

        // Create slides
        this.diplomats.forEach((diplomat, index) => {
            const slide = document.createElement('div');
            slide.className = 'diplomat-slide';
            slide.innerHTML = `
                <img src="${diplomat.image}" alt="${diplomat.name}" class="diplomat-image" onerror="this.src='/static/images/placeholder.jpg'">
                <div class="diplomat-info">
                    <div class="diplomat-name">${diplomat.name}</div>
                    <div class="diplomat-title">${diplomat.title}</div>
                </div>
            `;
            gallery.appendChild(slide);

            // Create dot
            const dot = document.createElement('div');
            dot.className = 'gallery-dot';
            dot.addEventListener('click', () => this.goToSlide(index));
            dotsContainer.appendChild(dot);
        });
    }

    setupEventListeners() {
        const prevBtn = document.getElementById('gallery-prev');
        const nextBtn = document.getElementById('gallery-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevSlide());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            this.slidesPerView = this.calculateSlidesPerView();
            this.updateNavigation();
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            }
        });
    }

    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateGallery();
        }
    }

    nextSlide() {
        const maxSlide = Math.max(0, this.diplomats.length - this.slidesPerView);
        if (this.currentSlide < maxSlide) {
            this.currentSlide++;
            this.updateGallery();
        }
    }

    goToSlide(index) {
        this.currentSlide = index;
        this.updateGallery();
    }

    updateGallery() {
        const gallery = document.getElementById('diplomat-gallery');
        if (!gallery) return;

        const slideWidth = 250 + 20; // slide width + gap
        const translateX = -this.currentSlide * slideWidth;
        gallery.style.transform = `translateX(${translateX}px)`;

        this.updateNavigation();
        this.updateDots();
    }

    updateNavigation() {
        const prevBtn = document.getElementById('gallery-prev');
        const nextBtn = document.getElementById('gallery-next');

        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 0;
            prevBtn.style.opacity = this.currentSlide === 0 ? '0.5' : '1';
        }

        if (nextBtn) {
            const maxSlide = Math.max(0, this.diplomats.length - this.slidesPerView);
            nextBtn.disabled = this.currentSlide >= maxSlide;
            nextBtn.style.opacity = this.currentSlide >= maxSlide ? '0.5' : '1';
        }
    }

    updateDots() {
        const dots = document.querySelectorAll('.gallery-dot');
        dots.forEach((dot, index) => {
            if (index >= this.currentSlide && index < this.currentSlide + this.slidesPerView) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

// Initialize the gallery when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DiplomatGallery();
}); 