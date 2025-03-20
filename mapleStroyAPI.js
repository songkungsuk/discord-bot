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
▶ 해방 퀘스트: ${basic.liberation_quest_clear_flag ? '완료' : '미완료'}
`;

        // 장비 아이템 정보
        if (itemEquipment.item_equipment && itemEquipment.item_equipment.length > 0) {
            result += `\n◈ 장비 아이템 ◈`;

            // 장비 표시 (전부)
            const primaryItems = itemEquipment.item_equipment

            if (primaryItems.length > 0) {
                primaryItems.forEach(item => {
                    result += `\n▶ ${item.item_equipment_slot}: ${item.item_name} [${item.potential_option_grade}]{${item.additional_potential_option_grade}} (${item.starforce}성)`;
                });
            } else {
                result += `\n▶ 장비 정보가 없습니다.`;
            }
        }

        // 캐시 아이템 정보
        if (cashItemEquipment.cash_item_equipment && cashItemEquipment.cash_item_equipment.length > 0) {
            result += `\n\n◈ 캐시 아이템 ◈`;

            // 대표 캐시 아이템 5개만 표시
            const primaryCashItems = cashItemEquipment.cash_item_equipment.slice(0, 5);

            primaryCashItems.forEach(item => {
                result += `\n▶ ${item.cash_item_slot}: ${item.cash_item_name}`;
            });
        }

        // 뷰티 정보
        if (beautyEquipment) {
            result += `\n\n◈ 뷰티 정보 ◈`;
            if (beautyEquipment.hair_name) {
                result += `\n▶ 헤어: ${beautyEquipment.hair_name}`;
            }
            if (beautyEquipment.face_name) {
                result += `\n▶ 성형: ${beautyEquipment.face_name}`;
            }
            if (beautyEquipment.skin_name) {
                result += `\n▶ 피부: ${beautyEquipment.skin_name}`;
            }
            if (!beautyEquipment.hair_name && !beautyEquipment.face_name && !beautyEquipment.skin_name) {
                result += `\n▶ 뷰티 정보가 없습니다.`;
            }
        }

        // 펫 정보
        result += `\n\n◈ 펫 장착 정보 ◈`;
        const pets = [petEquipment.pet_1, petEquipment.pet_2, petEquipment.pet_3].filter(Boolean);

        if (pets.length > 0) {
            pets.forEach((pet, index) => {
                result += `\n▶ 펫 ${index + 1}: ${pet.pet_name} (Lv.${pet.pet_level})`;
                if (pet.pet_nickname) {
                    result += ` - ${pet.pet_nickname}`;
                }
            });
        } else {
            result += `\n▶ 장착된 펫이 없습니다.`;
        }

        // 링크 스킬 정보
        if (linkSkill.link_skill && linkSkill.link_skill.length > 0) {
            result += `\n\n◈ 링크 스킬 ◈`;

            linkSkill.link_skill.forEach(skill => {
                result += `\n▶ ${skill.skill_name} (Lv.${skill.skill_level}) - ${skill.skill_description}`;
            });
        }

        // 헥사 매트릭스 정보
        if (hexamatrix.hexa_core_equipment && hexamatrix.hexa_core_equipment.length > 0) {
            result += `\n\n◈ 헥사 매트릭스 ◈`;

            // 대표 헥사 코어 5개만 표시
            const primaryCores = hexamatrix.hexa_core_equipment.slice(0, 5);

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

        result += `\n${basic.character_image}`
        return result;
    }
}


module.exports = MapleStoryAPI;