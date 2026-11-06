import"./mock-backend-Cm1IoOFL.js";import{a as b}from"./api-CKTZsajb.js";const y=localStorage.getItem("ongjin_font_scale")||"normal";document.documentElement.style.fontSize=y==="large"?"21px":"17px";window.logoutAndGoLogin=function(){localStorage.removeItem("ongjin_token"),localStorage.removeItem("ongjin_refresh"),localStorage.removeItem("ongjin_user"),window.location.href="/merchant/login.html"};async function f(){const m=localStorage.getItem("ongjin_token"),l=localStorage.getItem("ongjin_user");if(!(!m||!l))try{const e=JSON.parse(l);if(e.role!=="merchant")return;const o=await b.get("/merchant/my-info");if(o.success&&o.data){const a=o.data.status;if(a==="approved")e.status="approved",localStorage.setItem("ongjin_user",JSON.stringify(e)),window.location.replace("/merchant/index.html");else if(a==="rejected"){e.status="rejected",localStorage.setItem("ongjin_user",JSON.stringify(e)),document.body.style.background="#fdf2f2",document.body.style.backgroundImage="radial-gradient(circle at 10% 20%, #fee2e2 0%, #fdf2f2 100%)";const i=document.querySelector(".decor-top"),d=document.querySelector(".decor-bottom");i&&(i.style.background="radial-gradient(circle, rgba(220, 38, 38, 0.08) 0%, transparent 70%)"),d&&(d.style.background="radial-gradient(circle, rgba(220, 38, 38, 0.05) 0%, transparent 60%)");const r=document.querySelector(".apply-card"),p=document.querySelector(".logo-title"),n=document.querySelector(".logo-subtitle"),c=document.querySelector(".status-desc"),g=document.querySelector(".stepper"),u=document.querySelector(".btn-group"),t=document.querySelector(".status-icon-svg");r&&(r.style.borderTop="4px solid #dc2626",r.style.borderColor="rgba(220, 38, 38, 0.15)",r.style.boxShadow="0 20px 40px rgba(220, 38, 38, 0.05), 0 1px 3px rgba(0, 0, 0, 0.05)"),n&&(n.textContent="옹진 관광 쿠폰",n.style.color="#dc2626"),p&&(p.textContent="입점 심사 결과 안내"),t&&(t.style.stroke="#dc2626",t.style.animation="none",t.setAttribute("stroke-linecap","square"),t.setAttribute("stroke-linejoin","miter"),t.innerHTML=`
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              `);let s=(o.data.rejection_reason||"제출하신 서류 불충분 또는 정보 불일치").replace(/\[사유\]/g,"").trim();c&&(s.includes("유선")||s.includes("전화")?c.innerHTML=`
                  <p style="font-size: 1rem; line-height: 1.6; color: #475569;">
                    가맹점 등록 신청서 심사 결과<br />
                    <strong style="color: #dc2626;">반려 처리</strong>되었습니다.
                  </p>
                  <p style="margin-top: 14px; font-size: 0.95rem; color: #b91c1c; font-weight: 700; line-height: 1.5;">
                    담당자가 유선(전화)으로 상세 사유를 안내해 드렸습니다.
                  </p>
                  <p style="margin-top: 12px; font-size: 0.88rem; color: #64748b; line-height: 1.6;">
                    안내받으신 내용을 바탕으로 아래 [재입점 신청하기] 버튼을 눌러<br />제출 정보를 수정 후 다시 신청해 주시기 바랍니다.
                  </p>
                `:c.innerHTML=`
                  <p style="font-size: 1rem; line-height: 1.6; color: #475569;">
                    가맹점 등록 신청서 심사 결과<br />
                    <strong style="color: #dc2626;">아래 사유로 반려 처리</strong>되었습니다.
                  </p>
                  <p style="margin-top: 14px; font-size: 0.95rem; color: #b91c1c; font-weight: 700; line-height: 1.5;">
                    반려 사유: ${s}
                  </p>
                  <p style="margin-top: 12px; font-size: 0.88rem; color: #64748b; line-height: 1.6;">
                    위 사유를 확인하신 후 아래 [재입점 신청하기] 버튼을 눌러<br />제출 정보를 수정 후 다시 신청해 주시기 바랍니다.
                  </p>
                `),g&&(g.innerHTML=`
                <div class="step-item completed">
                  <div class="step-dot" style="background: #f8fafc; border-color: #cbd5e1; color: #64748b;">1</div>
                  <span class="step-label" style="color: #64748b;">신청서 접수</span>
                </div>
                <div class="step-item active" style="color: #dc2626;">
                  <div class="step-dot" style="background: #fef2f2; border-color: #dc2626; color: #dc2626; font-weight: 700; box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.15);">2</div>
                  <span class="step-label" style="color: #dc2626; font-weight: 700;">반려 처리</span>
                </div>
                <div class="step-item">
                  <div class="step-dot" style="background: #f8fafc; border-color: #cbd5e1; color: #64748b;">3</div>
                  <span class="step-label" style="color: #64748b;">승인 완료</span>
                </div>
              `),u&&(u.innerHTML=`
                <a href="/merchant/reapply.html" class="btn-action btn-primary" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);">
                  재입점 신청하기
                </a>
                <button type="button" onclick="window.logoutAndGoLogin()" class="btn-action btn-secondary" style="width: 100%; cursor: pointer;">
                  로그인 화면으로 돌아가기
                </button>
              `)}}}catch(e){console.warn("가맹점 상태 확인 실패:",e)}}document.addEventListener("DOMContentLoaded",f);
