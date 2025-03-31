const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class NoticeCrawling {
    constructor() {
        // 기본 설정
        this.targetUrl = process.env.TARGET_URL || 'https://example.com/board';
        this.checkInterval = parseInt(process.env.CHECK_INTERVAL) || 10 * 60 * 1000;
        this.dataStoragePath = process.env.DATA_STORAGE_PATH || path.join(__dirname, 'crawled_data.json');

        // 선택자 설정
        this.selector = process.env.SELECTOR || '.post-item';
        this.titleSelector = process.env.TITLE_SELECTOR || '.post-title';
        this.contentSelector = process.env.CONTENT_SELECTOR || '.post-content';
        this.dateSelector = process.env.DATE_SELECTOR || '.post-date';
        this.uniqueIdentifier = process.env.UNIQUE_IDENTIFIER || 'data-post-id';

        // 차단 방지 설정
        this.userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.randomDelay = {
            enabled: process.env.RANDOM_DELAY_ENABLED === 'true' || true,
            min: parseInt(process.env.RANDOM_DELAY_MIN) || 5000,
            max: parseInt(process.env.RANDOM_DELAY_MAX) || 10000
        };
        this.respectRobotsTxt = process.env.RESPECT_ROBOTS_TXT === 'true' || true;
        this.proxyOptions = {
            enabled: process.env.PROXY_ENABLED === 'true' || false,
            proxies: process.env.PROXIES ? process.env.PROXIES.split(',') : []
        };
        this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;

        // 크롤링 데이터
        this.crawledData = {
            lastChecked: null,
            posts: []
        };
        this.isNoticed = {
            notice: false,
            update: false,
            event: false,
            cash: false,
        }
        this.event = [];
    }

    // 저장된 데이터 로드
    loadSavedData() {
        try {
            if (fs.existsSync(this.dataStoragePath)) {
                const data = fs.readFileSync(this.dataStoragePath, 'utf8');
                this.crawledData = JSON.parse(data);
                console.log('기존 데이터를 로드했습니다.');
            } else {
                console.log('저장된 데이터가 없습니다. 새로운 데이터 파일을 생성합니다.');
                this.saveCrawledData();
            }
        } catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
    }

    // 크롤링한 데이터 저장
    saveCrawledData() {
        try {
            // fs.writeFileSync(this.dataStoragePath, JSON.stringify(this.crawledData, null, 2), 'utf8');
            console.log('데이터가 저장되었습니다.');
        } catch (error) {
            console.error('데이터 저장 중 오류 발생:', error);
        }
    }

    // 랜덤 지연 시간 생성
    getRandomDelay() {
        if (!this.randomDelay.enabled) return 0;
        return Math.floor(Math.random() * (this.randomDelay.max - this.randomDelay.min + 1)) + this.randomDelay.min;
    }

    // 프록시 선택
    getProxy() {
        if (!this.proxyOptions.enabled || this.proxyOptions.proxies.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * this.proxyOptions.proxies.length);
        return this.proxyOptions.proxies[randomIndex];
    }

    // robots.txt 확인
    async checkRobotsTxt() {
        if (!this.respectRobotsTxt) return true;

        try {
            const urlObj = new URL(this.targetUrl);
            const robotsTxtUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;

            console.log(`robots.txt 확인 중: ${robotsTxtUrl}`);
            const response = await axios.get(robotsTxtUrl);
            const robotsTxt = response.data;

            console.log('robots.txt 내용:');
            console.log(robotsTxt);

            // robots.txt가 비어있거나 '*' 사용자 에이전트에 대한 제한이 없으면 크롤링 허용
            if (!robotsTxt.trim() || !robotsTxt.includes('User-agent: *')) {
                console.log('일반적인 크롤러에 대한 제한이 명시되어 있지 않아 크롤링이 허용됩니다.');
                return true;
            }

            // User-agent: * 섹션 확인
            const lines = robotsTxt.split('\n');
            let relevantSection = false;
            let disallowedPaths = [];
            let hasDisallowDirective = false;

            for (const line of lines) {
                const trimmedLine = line.trim().toLowerCase();

                if (trimmedLine.startsWith('user-agent:')) {
                    // 모든 에이전트 또는 현재 에이전트에 해당하는 섹션 찾기
                    const agent = trimmedLine.substring('user-agent:'.length).trim();
                    relevantSection = (agent === '*' || this.userAgent.toLowerCase().includes(agent));
                } else if (relevantSection && trimmedLine.startsWith('disallow:')) {
                    hasDisallowDirective = true;
                    const path = trimmedLine.substring('disallow:'.length).trim();
                    if (path) disallowedPaths.push(path);
                } else if (relevantSection && trimmedLine.startsWith('crawl-delay:')) {
                    // Crawl-delay 존중
                    const delay = parseInt(trimmedLine.substring('crawl-delay:'.length).trim(), 10);
                    if (!isNaN(delay) && delay > 0) {
                        const delayMs = delay * 1000;
                        if (delayMs > this.checkInterval) {
                            console.log(`robots.txt에서 설정된 Crawl-delay (${delay}초)가 현재 설정된 확인 주기보다 깁니다. Crawl-delay를 적용합니다.`);
                            this.checkInterval = delayMs;
                        }
                    }
                }
            }

            // 관련 섹션에 Disallow 지시문이 없으면 모든 크롤링이 허용됨
            if (relevantSection && !hasDisallowDirective) {
                console.log('모든 경로에 대한 크롤링이 허용됩니다.');
                return true;
            }

            // 현재 URL이 disallow 경로에 포함되는지 확인
            const currentPath = urlObj.pathname;
            for (const path of disallowedPaths) {
                if (currentPath.startsWith(path)) {
                    console.log(`robots.txt에 의해 현재 URL에 대한 크롤링이 금지되어 있습니다: ${path}`);
                    return false;
                }
            }

            console.log('robots.txt 검사 완료: 크롤링 허용됨');
            return true;
        } catch (error) {
            console.error('robots.txt 확인 중 오류 발생:', error);
            // robots.txt를 확인할 수 없는 경우, 기본적으로 크롤링 허용
            return true;
        }
    }

    // 웹페이지 크롤링
    async crawlWebpage(message) {
        try {
            console.log(`${new Date().toLocaleString()} - 페이지 크롤링 준비 중...`);

            // 랜덤 지연 적용
            const delay = this.getRandomDelay();
            if (delay > 0) {
                console.log(`안전한 크롤링을 위해 ${delay / 1000}초 대기 중...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // HTTP 요청 옵션 설정
            const requestOptions = {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Referer': 'https://www.google.com/'  // 일반적인 진입점처럼 보이도록
                }
            };

            // 프록시 설정 추가
            const proxy = this.getProxy();
            if (proxy) {
                requestOptions.proxy = proxy;
                console.log(`프록시 사용 중: ${proxy}`);
            }

            console.log(`${new Date().toLocaleString()} - 페이지 크롤링 중...`);
            const response = await axios.get(this.targetUrl, requestOptions);
            const $ = cheerio.load(response.data);

            // 현재 시간 기록
            this.crawledData.lastChecked = new Date().toISOString();

            // 게시글 항목 선택
            const notiType = $(`.con_title`).text().replace(/\s+/g, ' ').trim();
            const postItems = $(this.selector);
            const newPosts = [];
            postItems.each((index, element) => {
                const postElement = $(element);
                const linkElement = postElement.find('p > a');
                const postId = linkElement.attr('href'); // href 속성을 고유 식별자로 사용

                // 새 글 정보 추출
                const title = postElement.find(this.titleSelector).text().trim();
                const content = postElement.find(this.contentSelector).text().trim();
                const date = postElement.find(this.dateSelector).text().trim();

                // 새 글 정보를 배열에 추가
                const newPost = {
                    id: postId,
                    title: title,
                    content: content,
                    date: date,
                    crawledAt: new Date().toISOString(),
                    link: linkElement,
                    notiType: notiType,
                };

                this.crawledData.posts.push(newPost);
                console.log(`크롤링한 글 제목: ${title}`);
                console.log(this.isAfterToday(newPost.date.substring(0, 11).trim()))
                console.log(newPost.date.substring(0, 11).trim())
                if (this.isAfterToday(newPost.date.substring(0, 11).trim())) {
                    if (!this.isNoticed.notice && notiType.includes('공지사항 제목')) {
                        newPosts.push(newPost);
                    } else if (!this.isNoticed.update && notiType.includes('업데이트 제목')) {
                        newPosts.push(newPost);
                    } else if (!this.isNoticed.cash && notiType.includes('캐시샵 공지 제목')) {
                        newPosts.push(newPost);
                    } else if (!this.isNoticed.event && notiType.includes('이벤트 제목')) {
                        newPosts.push(newPost);
                    }
                }
            });

            // 새 글을 찾았으면 데이터 저장
            if (newPosts.length > 0) {
                this.saveCrawledData();
                console.log(`${newPosts.length}개의 새 글을 크롤링했습니다.`);

                // 여기에 새 글이 발견되었을 때 수행할 작업을 추가할 수 있습니다.
                await new Promise(resolve => {
                    this.processNewPosts(newPosts, message);
                    resolve();
                });
            } else {
                console.log('새글이 없습니다.');
            }
        } catch (error) {
            console.error('크롤링 중 오류 발생:', error);
            throw error;
        }
    }

    // 새 글 처리
    processNewPosts(posts, message) {
        let noticeMsg = ``;

        if (posts[0].notiType.includes('공지사항 제목')) {
            noticeMsg += `📢공지사항 알림\n\n`;
        } else if (posts[0].notiType.includes('업데이트 제목')) {
            noticeMsg += `🚙업데이트 소식\n\n`;
        } else if (posts[0].notiType.includes('이벤트 제목')) {
            noticeMsg += `🎉진행중인 이벤트 소식🎉\n\n`;
        } else if (posts[0].notiType.includes('캐시샵 공지 제목')) {
            noticeMsg += `✨캐시샵 공지✨\n\n`;
        }

        // 여기에 새 글 처리 로직 추가
        // 예: 알림 전송, 데이터베이스 저장 등
        console.log('새 글 처리 중...');

        // 예시: 새 글 세부 정보 출력
        posts.forEach((post, index) => {
            noticeMsg += `\n`;
            if (post.notiType.includes('공지사항 제목')) {
                noticeMsg += `${post.notiType ? post.notiType : '[공지사항]'} : ${post.title} \n`;
                this.isNoticed.notice = true;
            } else if (post.notiType.includes('업데이트 제목')) {
                noticeMsg += `${post.notiType ? post.notiType : '[업데이트]'} : ${post.title} \n`;
                this.isNoticed.update = true;
            } else if (post.notiType.includes('이벤트 제목')) {
                noticeMsg += `${post.notiType ? post.notiType : '[이벤트]'} : ${post.title} \n`;
                this.isNoticed.event = true;
            } else if (post.notiType.includes('캐시샵 공지 제목')) {
                noticeMsg += `${post.notiType ? post.notiType : '[캐시샵]'} : ${post.title} \n`;
                this.isNoticed.notice = true;
            }
            noticeMsg += post.title !== post.content ? post.content.replace(/\s+/g, ' ').trim() + '\n' : '';
            noticeMsg += `${'https://maplestory.nexon.com' + post.link.attr('href')} \n기간 및 날짜 : ${post.date}\n`;
        });
        noticeMsg += '\n';
        message.channel.send(noticeMsg);
        console.log('공지사항 전달 완료');
    }

    // 크롤링 요청 실행 (재시도 로직 포함)
    async executeCrawlingRequest(message) {
        let retries = 0;

        while (retries <= this.maxRetries) {
            try {
                await this.crawlWebpage(message);
                return; // 성공적으로 실행됨
            } catch (error) {
                retries++;

                if (retries <= this.maxRetries) {
                    const waitTime = 1000 * Math.pow(2, retries); // 지수 백오프
                    console.log(`크롤링 실패, ${retries}번째 재시도 (${waitTime / 1000}초 후)...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    console.error(`최대 재시도 횟수(${this.maxRetries})를 초과했습니다.`);
                    throw error;
                }
            }
        }
    }

    // 크롤링 시작
    async start(message) {
        console.log('웹 페이지 크롤링 시스템을 시작합니다...');

        // robots.txt 확인
        const allowedToCrawl = await this.checkRobotsTxt();
        if (!allowedToCrawl) {
            console.log('robots.txt에 의해 크롤링이 금지되어 있습니다. 프로그램을 종료합니다.');
            return;
        }

        // 초기 크롤링 실행
        try {
            await this.executeCrawlingRequest(message);
        } catch (error) {
            console.error('초기 크롤링 실패:', error);
        }

        // 주기적으로 크롤링 실행
        console.log(`${this.checkInterval / 60000}분 간격으로 크롤링을 실행합니다.`);
        this.intervalId = setInterval(async () => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                this.isNoticed = {
                    notice: false,
                    update: false,
                    event: false,
                    cash: false,
                }
            }
            try {
                await this.executeCrawlingRequest(message);
            } catch (error) {
                console.error('주기적 크롤링 실패:', error);
            }
        }, this.checkInterval);
    }

    // 크롤링 중지
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            console.log('크롤링이 중지되었습니다.');
        }
    }

    getToday() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}.${month}.${day}`;
    }


    isAfterToday(dateStr) {
        // 오늘 날짜 가져오기
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 시간, 분, 초, 밀리초를 0으로 설정하여 날짜만 비교

        // 입력된 날짜 문자열을 Date 객체로 변환
        const parts = dateStr.split('.');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JavaScript의 월은 0부터 시작
        const day = parseInt(parts[2]);

        const inputDate = new Date(year, month, day);

        // 두 날짜 비교
        return inputDate >= today;
    }
}

module.exports = NoticeCrawling;