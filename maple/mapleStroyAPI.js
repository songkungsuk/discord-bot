// Nexon API 설정
const axios = require('axios');
require('dotenv').config();

class MapleStoryAPI {
    constructor() {
        this.baseUrl = 'https://open.api.nexon.com/maplestory/v1';
        this.apiKey = process.env.NEXON_API_KEY;
        this.endpoints = {
            getId: '/id',
            basic: '/character/basic',
            popularity: '/character/popularity',
            stat: '/character/stat',
            hyperStat: '/character/hyper-stat',
            propensity: '/character/propensity',
            ability: '/character/ability',
            itemEquipment: '/character/item-equipment',
            cashItemEquipment: '/character/cashitem-equipment',
            symbolEquipment: '/character/symbol-equipment',
            setEffect: '/character/set-effect',
            beautyEquipment: '/character/beauty-equipment',
            androidEquipment: '/character/android-equipment',
            petEquipment: '/character/pet-equipment',
            linkSkill: '/character/link-skill',
            vmatrix: '/character/vmatrix',
            hexamatrix: '/character/hexamatrix',
            hexamatrixStat: '/character/hexamatrix-stat',
            dojang: '/character/dojang',
        };
    }

    /**
     * API 요청을 보내는 기본 메서드
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} params - URL 쿼리 파라미터
     * @returns {Promise<Object>} - API 응답 데이터
     */
    async request(endpoint, params = {}) {
        try {
            const url = this.baseUrl + endpoint;
            const queryString = new URLSearchParams(params).toString();
            const fullUrl = `${url}?${queryString}`;

            const response = await axios.get(fullUrl, {
                headers: {
                    "x-nxopen-api-key": this.apiKey
                }
            });

            return response.data;
        } catch (error) {
            console.error(`API 요청 오류 (${endpoint}):`, error.response?.data || error.message);
            throw new Error(`API 요청 실패: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * 캐릭터 이름으로 OCID 조회
     * @param {string} characterName - 캐릭터 이름
     * @returns {Promise<string>} - 캐릭터의 OCID
     */
    async getOcid(characterName) {
        const data = await this.request(this.endpoints.getId, { character_name: characterName });
        return data.ocid;
    }

    /**
     * OCID와 엔드포인트를 사용하여 캐릭터 정보 조회
     * @param {string} ocid - 캐릭터 OCID
     * @param {string} endpointKey - endpoints 객체의 키 값
     * @param {Object} additionalParams - 추가 파라미터 (선택적)
     * @returns {Promise<Object>} - 조회된 캐릭터 정보
     */
    async getCharacterInfo(ocid, endpointKey, additionalParams = {}) {
        const endpoint = this.endpoints[endpointKey];
        if (!endpoint) {
            throw new Error(`존재하지 않는 엔드포인트입니다: ${endpointKey}`);
        }

        return await this.request(endpoint, { ocid, ...additionalParams });
    }

    /**
     * 특정 날짜의 캐릭터 정보 조회 (기준 날짜 지정)
     * @param {string} ocid - 캐릭터 OCID
     * @param {string} endpointKey - endpoints 객체의 키 값
     * @param {string} date - 조회 기준일 (YYYY-MM-DD 형식)
     * @returns {Promise<Object>} - 해당 날짜의 캐릭터 정보
     */
    async getCharacterInfoByDate(ocid, endpointKey, date) {
        return await this.getCharacterInfo(ocid, endpointKey, { date });
    }


    /**
     * 지연 시간을 주는 유틸리티 함수
     * @param {number} ms - 밀리초 단위의 지연 시간
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
   * 캐릭터의 모든 기본 정보 조회 (순차적 요청으로 API 제한 방지)
   * @param {string} characterName - 캐릭터 이름
   * @param {Array<string>} infoTypes - 조회할 정보 타입 배열 (endpoints 키값들)
   * @param {number} delayMs - 요청 사이의 지연 시간 (밀리초)
   * @returns {Promise<Object>} - 조회된 모든 캐릭터 정보
   */
    async getAllCharacterInfo(characterName, infoTypes = ['basic', 'popularity', 'stat'], delayMs = 100) {
        try {
            const ocid = await this.getOcid(characterName);
            const result = { ocid, characterName };

            // 순차적 요청 처리 (요청 사이에 지연 시간 추가)
            for (const type of infoTypes) {
                try {
                    const data = await this.getCharacterInfo(ocid, type);
                    result[type] = data;
                    // 마지막 요청이 아니면 지연 시간 추가
                    if (type !== infoTypes[infoTypes.length - 1]) {
                        await this.sleep(delayMs);
                    }
                } catch (error) {
                    console.error(`${type} 정보 조회 실패:`, error.message);
                    result[type] = { error: error.message };
                    // 오류가 발생해도 지연 시간 추가
                    if (type !== infoTypes[infoTypes.length - 1]) {
                        await this.sleep(delayMs);
                    }
                }
            }

            return result;
        } catch (error) {
            throw new Error(`캐릭터 정보 조회 실패: ${error.message}`);
        }
    }

    /**
     * 데몬 어벤져의 전투력을 계산하는 메서드
     * @param {Object} statData - 캐릭터의 스탯 데이터
     * @returns {number} - 계산된 전투력
     */
    calculateDemonAvengerCombatPower(statData) {
        if (!statData || !statData.final_stat) {
            return 0;
        }

        // 스탯 값 찾기 헬퍼 함수
        const findStat = (statName) => {
            const found = statData.final_stat.find(s => s.stat_name === statName);
            return found ? parseFloat(found.stat_value.replace(/,/g, '')) : 0;
        };

        // 데몬 어벤져 관련 스탯 추출
        const hp = findStat('최대 HP');
        const hpPercentage = findStat('HP 증가량') || 0;
        const str = findStat('STR');
        const attackPower = findStat('공격력');

        // 데미지 관련 스탯
        const damage = findStat('데미지');
        const bossDamage = findStat('보스 몬스터 데미지');
        const finalDamage = findStat('최종 데미지');
        const critDamage = findStat('크리티컬 데미지');
        const ignoreDefense = findStat('방어율 무시');

        // 데몬 어벤져 전투력 계산 (HP 기반)
        // HP는 공격력으로 환산되는 비율이 약 1:2.1 (게임 내 비율에 따라 다를 수 있음)
        const hpBasedAttackPower = hp * 0.01; // HP 1000당 공격력 10 정도로 환산

        // 기본 전투력 계산
        let combatPower = (hpBasedAttackPower * 3) + (str * 1) + (attackPower * 3);

        // 백분율 스탯 보정
        const damageMultiplier = (1 + (damage / 100));
        const bossDamageMultiplier = (1 + (bossDamage / 100) * 0.5);
        const finalDamageMultiplier = (1 + (finalDamage / 100));
        const critDamageMultiplier = (1 + ((critDamage - 100) / 100) * 0.35);
        const ignoreDefenseMultiplier = (1 + (ignoreDefense / 100) * 0.2);

        combatPower *= damageMultiplier;
        combatPower *= bossDamageMultiplier;
        combatPower *= finalDamageMultiplier;
        combatPower *= critDamageMultiplier;
        combatPower *= ignoreDefenseMultiplier;

        // 기타 보정 요소들
        const arcaneForce = findStat('아케인포스') || 0;
        const authenticForce = findStat('어센틱포스') || 0;
        const starForceTotal = findStat('스타포스') || 0;

        combatPower += (arcaneForce * 2);
        combatPower += (authenticForce * 3);
        combatPower += (starForceTotal * 1.5);

        return Math.floor(combatPower);
    }

    /**
     * 캐릭터의 전투력을 계산하는 메서드
     * @param {Object} characterInfo - getAllCharacterInfo로 가져온 캐릭터 정보
     * @returns {number} - 계산된 전투력
     */
    calculateCombatPower(characterInfo) {
        // 기본 정보와 스탯 데이터 확인
        if (!characterInfo.stat || !characterInfo.stat.final_stat || !characterInfo.basic) {
            console.error('캐릭터 정보가 불완전합니다.');
            return 0;
        }

        const statData = characterInfo.stat;
        const charClass = characterInfo.basic.character_class;

        // 데몬 어벤져 전용 계산 로직
        if (charClass.includes('데몬어벤져') || charClass.includes('데몬 어벤져')) {
            return this.calculateDemonAvengerCombatPower(statData);
        }

        // 스탯 값 찾기 헬퍼 함수
        const findStat = (statName) => {
            const found = statData.final_stat.find(s => s.stat_name === statName);
            return found ? parseFloat(found.stat_value.replace(/,/g, '')) : 0;
        };

        // 주요 스탯 값 추출
        const str = findStat('STR');
        const dex = findStat('DEX');
        const int = findStat('INT');
        const luk = findStat('LUK');

        // 공격 관련 스탯
        const attackPower = findStat('공격력');
        const magicPower = findStat('마력');
        const statAttackPower = findStat('최대 스탯공격력');

        // 데미지 관련 스탯
        const damage = findStat('데미지');
        const bossDamage = findStat('보스 몬스터 데미지');
        const finalDamage = findStat('최종 데미지');
        const critDamage = findStat('크리티컬 데미지');
        const ignoreDefense = findStat('방어율 무시');

        // 직업군에 따른 주 스탯과 부 스탯 결정
        let mainStat = 0;
        let subStat = 0;

        // 전사 계열
        if (charClass.includes('전사') || charClass.includes('팔라딘') ||
            charClass.includes('다크나이트') || charClass.includes('히어로') ||
            charClass.includes('소울마스터') || charClass.includes('미하일') ||
            charClass.includes('블래스터') || charClass.includes('데몬슬레이어') ||
            charClass.includes('아란') || charClass.includes('카이저') ||
            charClass.includes('아델') || charClass.includes('제로')) {
            mainStat = str;
            subStat = dex;
        }
        // 마법사 계열
        else if (charClass.includes('마법사') || charClass.includes('비숍') ||
            charClass.includes('아크메이지') || charClass.includes('플레임위자드') ||
            charClass.includes('배틀메이지') || charClass.includes('에반') ||
            charClass.includes('루미너스') || charClass.includes('일리움') ||
            charClass.includes('라라') || charClass.includes('키네시스')) {
            mainStat = int;
            subStat = luk;
        }
        // 궁수 계열
        else if (charClass.includes('궁수') || charClass.includes('보우마스터') ||
            charClass.includes('신궁') || charClass.includes('패스파인더') ||
            charClass.includes('윈드브레이커') || charClass.includes('메르세데스') ||
            charClass.includes('와일드헌터') || charClass.includes('카인')) {
            mainStat = dex;
            subStat = str;
        }
        // 도적 계열
        else if (charClass.includes('도적') || charClass.includes('나이트로드') ||
            charClass.includes('섀도어') || charClass.includes('듀얼블레이드') ||
            charClass.includes('팬텀') || charClass.includes('카데나') ||
            charClass.includes('호영') || charClass.includes('칼리')) {
            mainStat = luk;
            subStat = dex;
        }
        // 해적 계열 (STR)
        else if (charClass.includes('바이퍼') || charClass.includes('캐논슈터') ||
            charClass.includes('스트라이커') || charClass.includes('아크') ||
            charClass.includes('블래스터')) {
            mainStat = str;
            subStat = dex;
        }
        // 해적 계열 (DEX)
        else if (charClass.includes('캡틴') || charClass.includes('메카닉') ||
            charClass.includes('엔젤릭버스터')) {
            mainStat = dex;
            subStat = str;
        }
        // 제논 (특수 케이스)
        else if (charClass.includes('제논')) {
            mainStat = (str + dex + luk) / 3; // 평균값 사용
            subStat = 0; // 제논은 STR, DEX, LUK를 모두 주스탯으로 사용
        }
        // 기타 직업
        else {
            // 직업 구분이 불분명한 경우 최대값을 가진 스탯을 주력 스탯으로 간주
            const statValues = {
                'STR': str,
                'DEX': dex,
                'INT': int,
                'LUK': luk
            };

            const maxStat = Object.entries(statValues).reduce((max, [stat, value]) =>
                value > max.value ? { stat, value } : max, { stat: '', value: 0 });

            mainStat = maxStat.value;

            // 보조 스탯은 두 번째로 높은 값으로 설정
            const secondStat = Object.entries(statValues)
                .filter(([stat]) => stat !== maxStat.stat)
                .reduce((max, [stat, value]) => value > max.value ? { stat, value } : max, { stat: '', value: 0 });

            subStat = secondStat.value;
        }

        // 공격력 또는 마력 (직업에 따라 다름)
        let attack = 0;
        if (charClass.includes('마법사') || charClass.includes('비숍') ||
            charClass.includes('아크메이지') || charClass.includes('플레임위자드') ||
            charClass.includes('배틀메이지') || charClass.includes('에반') ||
            charClass.includes('루미너스') || charClass.includes('일리움') ||
            charClass.includes('키네시스')) {
            attack = magicPower;
        } else {
            attack = attackPower;
        }

        // 기본 전투력 계산 (근사치)
        let combatPower = 0;

        // 1. 스탯공격력 기반 계산 (가장 정확한 방법)
        if (statAttackPower > 0) {
            combatPower = statAttackPower * 3.5; // 스탯공격력에 가중치 적용
        }
        // 2. 주요 스탯 기반 계산 (스탯공격력이 없는 경우)
        else {
            combatPower = (mainStat * 4) + (subStat * 1) + (attack * 3);
        }

        // 백분율 스탯 보정
        const damageMultiplier = (1 + (damage / 100));
        const bossDamageMultiplier = (1 + (bossDamage / 100) * 0.5); // 보스 데미지는 가중치 적용
        const finalDamageMultiplier = (1 + (finalDamage / 100));
        const critDamageMultiplier = (1 + ((critDamage - 100) / 100) * 0.35); // 크리 데미지는 기본 100%에서 초과분만 계산
        const ignoreDefenseMultiplier = (1 + (ignoreDefense / 100) * 0.2); // 방무도 가중치 적용

        combatPower *= damageMultiplier;
        combatPower *= bossDamageMultiplier;
        combatPower *= finalDamageMultiplier;
        combatPower *= critDamageMultiplier;
        combatPower *= ignoreDefenseMultiplier;

        // 기타 보정 요소들
        const arcaneForce = findStat('아케인포스') || 0;
        const authenticForce = findStat('어센틱포스') || 0;
        const starForceTotal = findStat('스타포스') || 0;

        console.log('arcaneForce : ', arcaneForce);
        console.log('authenticForce : ', authenticForce);
        console.log('starForceTotal : ', starForceTotal);
        
        combatPower += (arcaneForce * 2);
        combatPower += (authenticForce * 3);
        combatPower += (starForceTotal * 1.5);

        return Math.floor(combatPower);
    }


    /**
     * 캐릭터 정보를 가공하여 사용자에게 표시할 문자열 생성
     * @param {Object} info - getAllCharacterInfo의 결과
     * @returns {string} - 포맷팅된 캐릭터 정보 문자열
     */
    formatCharacterInfo(info) {
        if (!info.basic) {
            return '기본 정보를 불러올 수 없습니다.';
        }

        const basic = info.basic;
        const popularity = info.popularity || { popularity: '정보 없음' };
        const stat = info.stat || { final_stat: [] };
        const itemEquipment = info.itemEquipment || { item_equipment: [] };
        const cashItemEquipment = info.cashItemEquipment || { cash_item_equipment: [] };
        const beautyEquipment = info.beautyEquipment || {};
        const petEquipment = info.petEquipment || { pet_1: null, pet_2: null, pet_3: null };
        const linkSkill = info.linkSkill || { link_skill: [] };
        const hexamatrix = info.hexamatrix || { hexa_core_equipment: [] };
        const dojang = info.dojang || { dojang_best_floor: 0, dojang_best_time: 0 };
        const symbolEquipment = info.symbolEquipment || { symbol: 'no info' };
        // 주요 스탯 추출
        const findStat = (statName) => {
            const found = stat.final_stat?.find(s => s.stat_name === statName);
            return found ? found.stat_value : '정보 없음';
        };

        const mainStat = findStat('최대 스탯공격력');
        const damage = findStat('데미지');
        const bossDamage = findStat('보스 몬스터 데미지');

        // 기본 정보 구성
        let result = `
캐릭터 정보: ${basic.character_name}
▶ 직업: ${basic.character_class} / 월드: ${basic.world_name}
▶ 레벨: ${basic.character_level} (${basic.character_exp_rate}%)
▶ 길드: ${basic.character_guild_name || '없음'} / 인기도: ${popularity.popularity}
▶ 스탯공격력: ${mainStat} / 데미지: ${damage}% / 보스 데미지: ${bossDamage}%
▶ 최근 7일간 로그인: ${basic.access_flag ? '접속' : '미접속'}
▶ 해방 퀘스트: ${basic.liberation_quest_clear_flag === 'true' ? '완료' : '미완료'}
`;

        // 장비 아이템 정보
        if (itemEquipment.item_equipment && itemEquipment.item_equipment.length > 0) {
            result += `\n◈ 장비 아이템 ◈`;

            // 장비 표시 (전부)
            const primaryItems = itemEquipment.item_equipment

            if (primaryItems.length > 0) {
                primaryItems.forEach(item => {
                    result += `\n▶ ${item.item_equipment_slot}: ${item.item_name}  [${item.potential_option_grade ? item.potential_option_grade : '잠재능력 없음'}][${item.additional_potential_option_grade ? item.additional_potential_option_grade : '에디셔널 없음'}] (${item.starforce}성)`;
                });
            } else {
                result += `\n▶ 장비 정보가 없습니다.`;
            }
        }

        // 심볼 정보
        if (symbolEquipment.symbol && symbolEquipment.symbol.length > 0) {
            result += `\n\n◈ 심볼 정보 ◈ \n`;

            // 심볼 표시 
            const symbol = symbolEquipment.symbol

            if (symbol.length > 0) {
                symbol.forEach((item, index) => {
                    const symbolRate = item.symbol_growth_count / (item.symbol_growth_count + item.symbol_require_growth_count)
                    result += `▶ ${item.symbol_name}: Lv. ${item.symbol_level} [${symbolRate.toFixed(2) * 100} %])  ${index % 2 === 1 ? '\n' : '  '}`;
                });
            } else {
                result += `\n▶ 심볼 정보가 없습니다.`;
            }
        }

        // 캐시 아이템 정보
        if (cashItemEquipment.cash_item_equipment_base && cashItemEquipment.cash_item_equipment_base.length > 0) {
            result += `\n\n◈ 캐시 아이템 ◈`;

            // Base 캐시 아이템 표시
            const primaryCashItems = cashItemEquipment.cash_item_equipment_base;

            primaryCashItems.forEach(item => {
                result += `\n▶ ${item.cash_item_equipment_slot}: ${item.cash_item_name}`;
            });
        }

        // 프리셋 캐시 아이템 정보
        if (cashItemEquipment.cash_item_equipment_preset_1 && cashItemEquipment.cash_item_equipment_preset_1.length > 0) {
            result += `\n\n◈ 프리셋 1 캐시 아이템 ◈`;

            // Preset 캐시 아이템 표시
            const primaryCashItems = cashItemEquipment.cash_item_equipment_preset_1;

            primaryCashItems.forEach(item => {
                result += `\n▶ ${item.cash_item_equipment_slot}: ${item.cash_item_name}`;
            });
        }

        if (cashItemEquipment.cash_item_equipment_preset_2 && cashItemEquipment.cash_item_equipment_preset_2.length > 0) {
            result += `\n\n◈ 프리셋 2 캐시 아이템 ◈`;

            // Preset 캐시 아이템 표시
            const primaryCashItems = cashItemEquipment.cash_item_equipment_preset_2;

            primaryCashItems.forEach(item => {
                result += `\n▶ ${item.cash_item_equipment_slot}: ${item.cash_item_name}`;
            });
        }

        if (cashItemEquipment.cash_item_equipment_preset_3 && cashItemEquipment.cash_item_equipment_preset_3.length > 0) {
            result += `\n\n◈ 프리셋 3 캐시 아이템 ◈`;

            // Preset 캐시 아이템 표시
            const primaryCashItems = cashItemEquipment.cash_item_equipment_preset_3;

            primaryCashItems.forEach(item => {
                result += `\n▶ ${item.cash_item_equipment_slot}: ${item.cash_item_name}`;
            });
        }

        // 캐시아이템 정보 끝

        // 뷰티 정보
        if (beautyEquipment) {
            result += `\n\n◈ 뷰티 정보 ◈`;
            if (beautyEquipment.character_hair) {
                result += `\n▶ 헤어: ${beautyEquipment.character_hair.hair_name}`;
            }
            if (beautyEquipment.character_face) {
                result += `\n▶ 성형: ${beautyEquipment.character_face.face_name}`;
            }
            if (beautyEquipment.character_skin) {
                result += `\n▶ 피부: ${beautyEquipment.character_skin.skin_name}`;
            }
        }

        // 펫 정보
        result += `\n\n◈ 펫 장착 정보 ◈`;
        const pets = [petEquipment.pet_1_name, petEquipment.pet_2_name, petEquipment.pet_3_name].filter(Boolean);

        if (pets.length > 0) {
            pets.forEach((pet_name, index) => {
                result += `\n▶ 펫 ${index + 1}: ${pet_name} `;
            });
        } else {
            result += `\n▶ 장착된 펫이 없습니다.`;
        }

        // 링크 스킬 정보
        if (linkSkill.character_link_skill && linkSkill.character_link_skill.length > 0) {
            result += `\n\n◈ 링크 스킬 ◈`;

            linkSkill.character_link_skill.forEach(skill => {
                result += `\n▶ ${skill.skill_name} (Lv.${skill.skill_level})`;
            });
        }

        // 헥사 매트릭스 정보
        if (hexamatrix.character_hexa_core_equipment && hexamatrix.character_hexa_core_equipment.length > 0) {
            result += `\n\n◈ 헥사 매트릭스 ◈`;

            // 헥사 코어 표시
            const primaryCores = hexamatrix.character_hexa_core_equipment;

            primaryCores.forEach(core => {
                result += `\n▶ ${core.hexa_core_name} (Lv.${core.hexa_core_level})`;
            });
        }

        // 무릉도장 정보
        if (dojang) {
            result += `\n\n◈ 무릉도장 ◈`;
            if (dojang.dojang_best_floor > 0) {
                const minutes = Math.floor(dojang.dojang_best_time / 60);
                const seconds = dojang.dojang_best_time % 60;
                result += `\n▶ 최고 기록: ${dojang.dojang_best_floor}층 (${minutes}분 ${seconds}초)`;
            } else {
                result += `\n▶ 무릉도장 기록이 없습니다.`;
            }
        }


        //전투력 계산
        const combatPower = this.calculateCombatPower(info);
        result += `\n\n예상 전투력: ${combatPower.toLocaleString()}`;



        result += `\n${basic.character_image}`;
        return result;
    }
}


module.exports = MapleStoryAPI;