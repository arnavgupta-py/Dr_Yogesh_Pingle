document.addEventListener('DOMContentLoaded', function () {

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    const keys = document.querySelectorAll('.key');
    const keyContainer = document.querySelector('.white-keys');
    const contentSections = document.querySelectorAll('.content-section');
    const contentContainer = document.getElementById('content-container');

    const portfolioDataCache = {};

    const sectionRenderers = {
        'about': renderAbout,
        'education': renderEducation,
        'experience': renderExperience,
        'publications': renderPublications,
        'events': renderEvents,
        'contributions': renderContributions,
        'awards': renderAwards,
        'contact': renderContact,
    };

    const fetchInitialData = async (sections) => {
        try {
            for (const section of sections) {
                const response = await fetch(`static/data/${section}.json`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} for ${section}.json`);
                }
                portfolioDataCache[section] = await response.json();
            }
        } catch (error) {
            console.error("Could not pre-fetch portfolio data:", error);
        }
    };

    const observeElements = (elements) => {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    
                    if (entry.target.classList.contains('content-grid')) {
                        entry.target.querySelectorAll('.content-card').forEach((card, index) => {
                            card.style.setProperty('--card-index', index);
                        });
                    }
                    observerInstance.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        elements.forEach(el => observer.observe(el));
    };

    // --- HELPER FUNCTIONS ---

    // 1. Academic Year Logic (June 1st Cutoff)
    // 01 June 2024 to 31 May 2025 -> 2024-2025
    function getAcademicYear(year, month) {
        // Handle input month (1-12 or "January")
        let monthIndex = -1; // 0-11
        
        if (typeof month === 'string') {
            const date = new Date(`${month} 1, 2000`);
            monthIndex = date.getMonth();
        } else {
            monthIndex = month - 1; 
        }

        // June (Index 5) is the start of the new academic year
        if (monthIndex >= 5) {
            return `${year}-${year + 1}`;
        } else {
            return `${year - 1}-${year}`;
        }
    }

    // 2. Parse Date String for Events/Contributions
    // e.g. "July 2024 - March 2025" -> "2024-2025"
    // e.g. "07 Feb 2025" -> "2024-2025"
    function getAcademicYearFromDateStr(dateStr) {
        const years = dateStr.match(/\d{4}/g);
        if (!years) return 'Unknown';

        // Use the first year mentioned as the anchor
        const year = parseInt(years[0]);
        
        // Try to find a month name
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", 
                            "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthRegex = new RegExp(`\\b(${monthNames.join('|')})\\b`, 'i');
        const match = dateStr.match(monthRegex);

        let monthIndex = 0; // Default to Jan if no month found (implies Spring semester of that year usually)
        
        if (match) {
            const date = new Date(`${match[0]} 1, ${year}`);
            monthIndex = date.getMonth();
        }

        // Apply Logic: June (5) or later starts the year
        if (monthIndex >= 5) {
            return `${year}-${year + 1}`;
        } else {
            // E.g. Feb 2025 (Index 1) -> 2024-2025
            return `${year - 1}-${year}`;
        }
    }

    // 3. Generic Filter Setup
    function setupFiltering(items, searchInputId, filterContainerId, dateAttribute = null) {
        const searchInput = document.getElementById(searchInputId);
        const filterContainer = document.getElementById(filterContainerId);
        
        const filterItems = () => {
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const activeFilter = filterContainer ? filterContainer.querySelector('.filter-btn.active') : null;
            const activeYear = activeFilter ? activeFilter.dataset.year : 'all';

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                const year = dateAttribute ? item.dataset[dateAttribute] : 'all';
                
                const matchesSearch = text.includes(searchTerm);
                const matchesYear = (activeYear === 'all' || year === activeYear);

                if (matchesSearch && matchesYear) {
                    item.style.display = ''; 
                    item.classList.remove('hidden');
                } else {
                    item.style.display = 'none';
                    item.classList.add('hidden');
                }
            });
        };

        if (searchInput) searchInput.addEventListener('input', filterItems);
        
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-btn')) {
                    filterContainer.querySelector('.filter-btn.active').classList.remove('active');
                    e.target.classList.add('active');
                    filterItems();
                }
            });
        }
    }

    function renderAbout(data) {
        const section = document.getElementById('about');
        const grid = section.querySelector('.content-grid');
        const taglineTemplate = document.getElementById('template-tagline');
        const expertiseTemplate = document.getElementById('template-expertise');
        
        if (!grid || !taglineTemplate || !expertiseTemplate) return;

        grid.innerHTML = '';
        
        const taglineClone = taglineTemplate.content.cloneNode(true);
        taglineClone.querySelector('p').textContent = data.tagline;
        grid.appendChild(taglineClone);

        const expertiseHeading = document.createElement('h2');
        expertiseHeading.textContent = 'Expertise';
        expertiseHeading.className = 'expertise-heading';
        expertiseHeading.dataset.scroll = '';
        grid.appendChild(expertiseHeading);

        data.expertise.forEach(item => {
            const expertiseClone = expertiseTemplate.content.cloneNode(true);
            const iconElement = expertiseClone.querySelector('i');
            const nameElement = expertiseClone.querySelector('h4');
            const descElement = expertiseClone.querySelector('p');
            
            if (iconElement) iconElement.className = item.icon;
            if (nameElement) nameElement.textContent = item.name;
            if (descElement) descElement.textContent = item.description;
            
            grid.appendChild(expertiseClone);
        });

        observeElements(section.querySelectorAll('[data-scroll]'));
    };

    function renderEducation(data) {
        const section = document.getElementById('education');
        if (!section) return;

        const timelineGrid = section.querySelector('.content-grid');
        const timelineContainer = section.querySelector('.timeline-bar-container');
        const certificatesContainer = document.getElementById('certificates-container');
        
        renderEducationTimeline(data.timeline, timelineGrid, timelineContainer);
        renderEducationCertificates(data.certificates, certificatesContainer);

        observeElements(section.querySelectorAll('[data-scroll]'));
    }

    function renderEducationTimeline(timelineData, grid, timelineContainer) {
        if (!grid || !timelineContainer || !timelineData) return;
        
        grid.innerHTML = '';
        timelineContainer.innerHTML = '';

        timelineData.forEach((item, index) => {
            const uniqueId = `edu-${index}`;

            const timelineNode = document.createElement('div');
            timelineNode.className = 'timeline-node';
            timelineNode.dataset.id = uniqueId;

            const timelineCircle = document.createElement('div');
            timelineCircle.className = 'timeline-circle';
            
            const timelineYear = document.createElement('span');
            timelineYear.className = 'timeline-year';
            timelineYear.textContent = item.year;

            timelineNode.appendChild(timelineCircle);
            timelineNode.appendChild(timelineYear);
            timelineContainer.appendChild(timelineNode);

            const card = document.createElement('div');
            card.className = 'content-card education-card';
            card.dataset.scroll = '';
            card.dataset.id = uniqueId;

            const header = document.createElement('div');
            header.className = 'education-header';
            
            const degree = document.createElement('h3');
            degree.className = 'degree';
            degree.textContent = item.degree;
            
            const branch = document.createElement('h4');
            branch.className = 'branch';
            if (item.branch) branch.textContent = item.branch;

            header.appendChild(degree);
            if (item.branch) header.appendChild(branch);

            const body = document.createElement('div');
            body.className = 'education-body';

            const college = document.createElement('p');
            college.className = 'college';
            college.textContent = item.college;
            body.appendChild(college);
            
            const details = document.createElement('p');
            details.className = 'details';
            details.textContent = item.details;
            
            card.appendChild(header);
            card.appendChild(body);
            if (item.details) card.appendChild(details);
            grid.appendChild(card);
        });
        
        setupEducationHover();
    }

    function renderEducationCertificates(certificateData, container) {
        if (!container || !certificateData) return;
        container.innerHTML = '';
        const cardTemplate = document.getElementById('template-certificate-card');

        certificateData.forEach(yearGroup => {
            const row = document.createElement('div');
            row.className = 'certificate-row';
            row.dataset.scroll = '';

            const yearEl = document.createElement('div');
            yearEl.className = 'certificate-year';
            yearEl.textContent = yearGroup.year;
            row.appendChild(yearEl);

            const cardsGrid = document.createElement('div');
            cardsGrid.className = 'certificate-cards-grid';

            yearGroup.items.forEach(item => {
                const cardClone = cardTemplate.content.cloneNode(true);
                cardClone.querySelector('.certificate-image').src = item.image;
                cardClone.querySelector('.certificate-image').alt = item.title;
                cardClone.querySelector('.certificate-title').textContent = item.title;
                cardClone.querySelector('.certificate-issuer').textContent = item.issuer;
                cardsGrid.appendChild(cardClone);
            });

            row.appendChild(cardsGrid);
            container.appendChild(row);
        });
    }

    function renderExperience(data) {
        const section = document.getElementById('experience');
        const container = section.querySelector('.timeline-container');
        const template = document.getElementById('template-experience');

        if (!container || !template || !data) return;
        container.innerHTML = '';

        data.forEach(item => {
            const clone = template.content.cloneNode(true);
            
            clone.querySelector('.experience-title').textContent = item.title;
            clone.querySelector('.experience-dates').textContent = item.dates;
            clone.querySelector('.experience-institution').textContent = item.institution;
            
            const responsibilitiesList = clone.querySelector('.experience-responsibilities');
            responsibilitiesList.innerHTML = '';
            item.responsibilities.forEach(resp => {
                const li = document.createElement('li');
                li.textContent = resp;
                responsibilitiesList.appendChild(li);
            });

            container.appendChild(clone);
        });
        observeElements(section.querySelectorAll('[data-scroll]'));
    }

    function renderPublications(data) {
        const section = document.getElementById('publications');
        const container = section.querySelector('.publication-list');
        const template = document.getElementById('template-publication');
        const filterContainer = document.getElementById('filters-publications');

        if (!container || !template || !data) return;
        
        container.innerHTML = '';
        const years = new Set();

        data.forEach(item => {
            const clone = template.content.cloneNode(true);
            const pubItem = clone.querySelector('.publication-item');
            
            // Calculate Academic Year based on strict June 1st cutoff
            const acYear = getAcademicYear(item.year, item.month);
            pubItem.dataset.year = acYear;
            years.add(acYear);
            
            clone.querySelector('.publication-title').textContent = item.title;
            clone.querySelector('.publication-authors').textContent = item.authors;
            clone.querySelector('.publication-outlet').textContent = `${item.outlet}, ${item.year}`;
            clone.querySelector('.publication-link').href = item.link;

            container.appendChild(clone);
        });

        if (filterContainer) {
            filterContainer.innerHTML = '<button class="filter-btn active" data-year="all">All</button>';
            [...years].sort().reverse().forEach(year => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.textContent = year;
                btn.dataset.year = year;
                filterContainer.appendChild(btn);
            });
        }
        
        setupFiltering(section.querySelectorAll('.publication-item'), 'search-publications', 'filters-publications', 'year');
        observeElements(section.querySelectorAll('[data-scroll]'));
    }

    function renderEvents(data) {
        const section = document.getElementById('events');
        const container = section.querySelector('.content-grid');
        const template = document.getElementById('template-event');
        const filterContainer = document.getElementById('filters-events');

        if (!container || !template || !data) return;
        container.innerHTML = '';
        const years = new Set();

        
        data.forEach(item => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.event-card');
            
            const year = getAcademicYearFromDateStr(item.date);
            card.dataset.year = year;
            years.add(year);

            clone.querySelector('.event-name').textContent = item.name;
            clone.querySelector('.event-icon').className = `event-icon ${item.icon}`;
            clone.querySelector('.event-role').textContent = item.role;
            clone.querySelector('.event-organizer').textContent = item.organizer;
            clone.querySelector('.event-date').textContent = item.date;

            container.appendChild(clone);
        });

        if (filterContainer) {
            filterContainer.innerHTML = '<button class="filter-btn active" data-year="all">All</button>';
            [...years].sort().reverse().forEach(year => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.textContent = year;
                btn.dataset.year = year;
                filterContainer.appendChild(btn);
            });
        }

        setupFiltering(section.querySelectorAll('.event-card'), 'search-events', 'filters-events', 'year');
        observeElements(section.querySelectorAll('[data-scroll]'));
    }
    
    function renderContributions(data) {
        const section = document.getElementById('contributions');
        const container = section.querySelector('.content-grid');
        const template = document.getElementById('template-contribution');
        const filterContainer = document.getElementById('filters-contributions'); 

        if (!container || !template || !data) return;
        container.innerHTML = '';
        const years = new Set();

        data.forEach(item => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.contribution-card');
            
            let year = 'Other';
            if (item.date) {
                year = getAcademicYearFromDateStr(item.date);
            }
            
            card.dataset.year = year;
            years.add(year);

            clone.querySelector('.contribution-title').textContent = item.title;
            clone.querySelector('.contribution-icon').className = `contribution-icon ${item.icon}`;
            clone.querySelector('.contribution-role').textContent = item.role;
            clone.querySelector('.contribution-organization').textContent = item.organization;
            clone.querySelector('.contribution-detail-desc').textContent = item.details;

            container.appendChild(clone);
        });

        if (filterContainer) {
            filterContainer.innerHTML = '<button class="filter-btn active" data-year="all">All</button>';
            [...years].sort().reverse().forEach(year => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.textContent = year;
                btn.dataset.year = year;
                filterContainer.appendChild(btn);
            });
        }
        
        setupFiltering(section.querySelectorAll('.contribution-card'), 'search-contributions', 'filters-contributions', 'year');
        observeElements(section.querySelectorAll('[data-scroll]'));
    }
    
    function renderAwards(data) {
        const section = document.getElementById('awards');
        const container = section.querySelector('.content-grid');
        const template = document.getElementById('template-award');

        if (!container || !template || !data) return;
        container.innerHTML = '';

        data.forEach(item => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.award-card');

            card.querySelector('.award-icon').className = `award-icon ${item.icon}`;
            card.querySelector('.award-name').textContent = item.name;
            card.querySelector('.award-body').textContent = item.body;
            card.querySelector('.award-year').textContent = item.year;
            
            container.appendChild(clone);
        });
        observeElements(section.querySelectorAll('[data-scroll]'));
    }

    function renderContact(data) {
        const section = document.getElementById('contact');
        const container = section.querySelector('.content-grid');
        const template = document.getElementById('template-contact');

        if (!container || !template || !data) return;
        container.innerHTML = '';

        const clone = template.content.cloneNode(true);
        clone.querySelector('.contact-text').textContent = data.message;
        
        const emailLink = clone.querySelector('.contact-item.email');
        emailLink.href = `mailto:${data.email}`;
        emailLink.querySelector('span').textContent = data.email;
        
        clone.querySelector('.address').textContent = data.address;
        clone.querySelector('.linkedin').href = data.linkedin;
        clone.querySelector('.scholar').href = data.scholar;

        const membershipsList = clone.querySelector('.memberships-list');
        if (data.memberships && data.memberships.length > 0) {
            data.memberships.forEach(membershipText => {
                const li = document.createElement('li');
                li.textContent = membershipText;
                membershipsList.appendChild(li);
            });
        } else {
            clone.querySelector('.memberships').style.display = 'none';
        }
        
        container.appendChild(clone);
        observeElements(section.querySelectorAll('[data-scroll]'));
    }

    const setupEducationHover = () => {
        const cards = document.querySelectorAll('#education .education-card');
        cards.forEach(card => {
            const id = card.dataset.id;
            const node = document.querySelector(`.timeline-node[data-id="${id}"]`);
            if (!node) return;

            card.addEventListener('mouseenter', () => node.classList.add('is-active'));
            card.addEventListener('mouseleave', () => node.classList.remove('is-active'));
        });
    };

    const handleKeyActivation = (key, playSound = true, shouldScroll = true) => {
        if (!key) return;

        const sectionId = key.dataset.section;
        const targetSection = document.getElementById(sectionId);
        const noteName = key.dataset.note;

        if (noteName && playSound) {
            const noteAudio = document.getElementById('audio-' + noteName);
            if (noteAudio) {
                noteAudio.currentTime = 0;
                noteAudio.play().catch(error => console.error("Audio play failed:", error));
            }
        }
        
        keys.forEach(k => k.classList.remove('active'));
        key.classList.add('active');
        
        let sectionAlreadyRendered = true;
        contentSections.forEach(section => {
            const contentArea = section.querySelector('.content-grid') || section.querySelector('.timeline-container') || section.querySelector('.publication-list');
            if (section.id === sectionId && contentArea && contentArea.innerHTML.trim() === '') {
                sectionAlreadyRendered = false;
            }
            section.classList.remove('active-section');
        });
        
        if (targetSection) {
            targetSection.classList.add('active-section');
            
            const renderFunction = sectionRenderers[sectionId];
            if (renderFunction && !sectionAlreadyRendered) {
                const data = portfolioDataCache[sectionId];
                if (data) {
                    renderFunction(data);
                } else {
                    const targetContainer = section.querySelector('.content-grid') || section.querySelector('.timeline-container') || section.querySelector('.publication-list');
                    if (targetContainer) {
                        targetContainer.innerHTML = `<p style="text-align: center; color: var(--text-color);">Could not load content. Please ensure <code>data/${sectionId}.json</code> exists and is correctly formatted.</p>`;
                    }
                }
            }

            if (shouldScroll) {
                const headerOffset = 40;
                const elementPosition = contentContainer.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        }
    };

    keyContainer.addEventListener('click', (event) => {
        const key = event.target.closest('.key');
        if (key) {
            handleKeyActivation(key);
        }
    });

    keyContainer.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && document.activeElement.classList.contains('key')) {
            event.preventDefault();
            handleKeyActivation(document.activeElement);
        }
    });
    
    const initializePage = async () => {
        observeElements(document.querySelectorAll('[data-scroll]'));

        const sectionsToLoad = ['about', 'education', 'experience', 'publications', 'events', 'contributions', 'awards', 'contact'];
        await fetchInitialData(sectionsToLoad);

        if (keys.length > 0) {
            handleKeyActivation(keys[0], false, false);
        }
    };

    initializePage();
});