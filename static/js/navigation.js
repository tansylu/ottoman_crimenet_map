// Ottoman Crime Network Map - Navigation Module

document.addEventListener('DOMContentLoaded', function() {
    console.log("Navigation module loaded");
    
    // Initialize smooth scrolling for navigation links
    initSmoothScrolling();
    
    // Initialize scroll spy for navbar highlighting
    initScrollSpy();
});

/**
 * Initialize smooth scrolling for navigation links
 */
function initSmoothScrolling() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for header height
                    behavior: 'smooth'
                });
            }
        });
    });
    console.log("Smooth scrolling initialized");
}

/**
 * Initialize scroll spy functionality to highlight navbar items on scroll
 */
function initScrollSpy() {
    // Get all sections that should be observed
    const sections = document.querySelectorAll('.section');
    
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Create a map of section IDs to their corresponding nav links
    const sectionNavMap = {};
    navLinks.forEach(link => {
        const targetId = link.getAttribute('href');
        if (targetId.startsWith('#')) {
            sectionNavMap[targetId.substring(1)] = link;
        }
    });
    
    // Create the Intersection Observer
    const observerOptions = {
        root: null, // Use the viewport as the root
        rootMargin: '-100px 0px -70% 0px', // Adjust these values to control when sections are considered "visible"
        threshold: 0 // Trigger when any part of the section is visible
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Get the section ID
            const id = entry.target.getAttribute('id');
            
            // Find the corresponding nav link
            const navLink = sectionNavMap[id];
            
            if (navLink) {
                if (entry.isIntersecting) {
                    // Add active class to the nav link
                    navLinks.forEach(link => link.classList.remove('active'));
                    navLink.classList.add('active');
                }
            }
        });
    }, observerOptions);
    
    // Observe all sections
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // Also observe the hero section if it exists
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        observer.observe(heroSection);
    }
    
    console.log("Scroll spy initialized");
}
