"""Idempotent local development data for every public business domain.

The seed uses human-readable business keys (phone/title/SN) instead of generated
primary keys, so it is safe to run on every backend restart.  It is intentionally
limited to local development and never creates a paid, signed, inspected or
blockchain-confirmed record.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import *  # noqa: F403,F401 - seed is a registry of all demo domains


PASSWORD = "REDACTED_SECRET"


def _user(db, phone, nickname, role):
    item = db.query(User).filter(User.phone == phone).first()
    if not item:
        item = User(phone=phone, nickname=nickname, hashed_password=get_password_hash(PASSWORD), active_role=role)
        db.add(item)
        db.flush()
    if not db.query(UserRole).filter(UserRole.user_id == item.id, UserRole.role == role).first():
        db.add(UserRole(user_id=item.id, role=role))
    if not db.query(Wallet).filter(Wallet.user_id == item.id).first():
        db.add(Wallet(user_id=item.id, available=Decimal("1200.00"), frozen=Decimal("0.00"), escrow=Decimal("0.00")))
    return item


def _home(db):
    rows = [
        ("carousel", "无人机巡检服务", "AI 影像与合规作业方案", "/pages/flight/index", "首页轮播"),
        ("carousel", "二手无人机严选", "SN 履历与质检信息可追溯", "/pages/market/index", "首页轮播"),
        ("carousel", "CAAC 实训课程", "飞行训练、题库与学习进度", "/pages/academy/index", "首页轮播"),
        ("summary", "飞行任务", "12", "/pages/work/index", "平台实时统计"),
        ("summary", "认证机构", "8", "/pages/academy/institutions", "平台实时统计"),
        ("summary", "在售设备", "24", "/pages/market/index", "平台实时统计"),
        ("summary", "题库题目", "120", "/pages/academy/exam", "平台实时统计"),
        ("entries", "找机构", "试听预约与课程", "/pages/academy/institutions", "常用入口"),
        ("entries", "找任务", "按资质和城市筛选", "/pages/work/index", "常用入口"),
        ("entries", "买设备", "二手无人机与配件", "/pages/market/index", "常用入口"),
        ("entries", "飞行服务", "天气、空域与飞场", "/pages/flight/index", "常用入口"),
        ("tasks", "山区物资运输航线规划", "北京 · 明日 09:00", "/pages/work/task-detail?id=1", "加急"),
        ("institutions", "北京低空飞行学院", "CAAC 超视距 · 资质已核验", "/pages/academy/institution-detail?id=1", "已核验"),
        ("devices", "DJI Mavic 3 行业版", "北京 · SN 履历待核验", "/pages/market/product-detail?id=1", "待核验"),
        ("rumors", "官方辟谣：临时空域以通告为准", "来源：中国民航局公开信息", "/pages/community/knowledge", "官方"),
    ]
    carousel_images = {
        "无人机巡检服务": "/static/images/lowair-carousel-work.png",
        "二手无人机严选": "/static/images/lowair-market-drone.png",
        "CAAC 实训课程": "/static/images/lowair-academy-training.png",
    }
    for index, (module, title, note, target, category) in enumerate(rows):
        item = db.query(HomeContent).filter(HomeContent.module_key == module, HomeContent.title == title).first()
        if not item:
            item = HomeContent(module_key=module, category=category, title=title, note=note, target_url=target, rank=100 - index)
            db.add(item)
        item.payload = {"image": carousel_images.get(title, "")} if module == "carousel" else (item.payload or {})
    if not db.query(FlightAdvisory).filter(FlightAdvisory.title == "北京北部临时空域通告").first():
        db.add(FlightAdvisory(city="北京", advisory_type="airspace", level="中", title="北京北部临时空域通告",
                              note="请在主管部门平台核对当日许可", source="演示数据 · 待接入权威空域服务"))


def _academy(db, institution_owner, learner):
    inst = db.query(AcademyInstitution).filter(AcademyInstitution.name == "北京低空飞行学院").first()
    if not inst:
        inst = AcademyInstitution(owner_id=institution_owner.id, name="北京低空飞行学院", city="北京", level="CAAC 超视距",
                                  schedule="周末班", address="北京市顺义区低空产业园", tagline="飞行训练与合规作业一体化",
                                  image="/static/images/lowair-academy-training.png", rating=4.8, verified=True,
                                  qualification="培训资质已提交，详情以审核服务为准", pass_rate=86.5, pass_rate_source="机构自报，待核验",
                                  facilities=["模拟飞行室", "实训飞场"])
        db.add(inst); db.flush()
    course = db.query(AcademyCourse).filter(AcademyCourse.name == "超视距驾驶员基础班").first()
    if not course:
        course = AcademyCourse(institution_id=inst.id, name="超视距驾驶员基础班", level="CAAC 超视距", schedule="周末班",
                               duration="8 周", price=Decimal("12800"), trial=True, status="published")
        db.add(course); db.flush()
    if not db.query(AcademyEnrollment).filter(AcademyEnrollment.user_id == learner.id, AcademyEnrollment.course_id == course.id).first():
        db.add(AcademyEnrollment(user_id=learner.id, course_id=course.id, status="active"))
    if not db.query(AcademyLesson).filter(AcademyLesson.course_id == course.id).first():
        db.add_all([
            AcademyLesson(course_id=course.id, chapter_title="飞行安全", chapter_order=1, title="飞前检查与风险识别", lesson_type="video", duration_minutes=32, sort_order=1, resource_url="/static/videos/drone-preflight.mp4"),
            AcademyLesson(course_id=course.id, chapter_title="法规基础", chapter_order=2, title="空域与临时通告", lesson_type="video", duration_minutes=28, sort_order=2, resource_url="/static/videos/drone-airspace.mp4"),
        ])
    questions = [
        ("single", "飞行前检查中最先确认哪一项？", [{"key": "A", "text": "设备外观与电源状态"}, {"key": "B", "text": "立即起飞"}, {"key": "C", "text": "跳过气象"}], ["A"]),
        ("single", "发现临时空域限制时应如何处理？", [{"key": "A", "text": "停止进入并复核权威通告"}, {"key": "B", "text": "继续原计划"}, {"key": "C", "text": "关闭提示"}], ["A"]),
        ("judge", "电池鼓包时仍可低功率试飞。", [{"key": "A", "text": "正确"}, {"key": "B", "text": "错误"}], ["B"]),
    ]
    for qtype, stem, options, answers in questions:
        if not db.query(AcademyQuestion).filter(AcademyQuestion.stem == stem).first():
            db.add(AcademyQuestion(question_type=qtype, stem=stem, options=options, correct_answers=answers,
                                   explanation="请结合设备手册、现场条件和主管部门要求判断。", source="本地演示题库，待接入真实题库"))
    if not db.query(AcademySubsidyPolicy).filter(AcademySubsidyPolicy.title == "北京低空技能培训补贴").first():
        db.add(AcademySubsidyPolicy(city="北京", title="北京低空技能培训补贴", status="待核验", note="政策条件和材料以官方最新公告为准",
                                    materials=["身份证明", "培训发票"], source_name="政策来源待接入", source_url=""))


def _work(db, company_owner, pilot):
    company = db.query(CompanyProfile).filter(CompanyProfile.name == "天穹巡检科技").first()
    if not company:
        company = CompanyProfile(owner_id=company_owner.id, name="天穹巡检科技", industry="电力巡检", scale="50-100人", address="北京", intro="无人机巡检与数据服务")
        db.add(company); db.flush()
    if not db.query(Job).filter(Job.title == "无人机电力巡检飞手").first():
        db.add(Job(company_id=company.id, title="无人机电力巡检飞手", city="北京", salary_min=12000, salary_max=18000,
                   employment="全职", experience="1-3年", education="大专", caac="超视距", aircraft=["Mavic 3E"],
                   responsibilities=["执行巡检航线", "整理影像数据"], requirements=["CAAC 资质"], benefits=["五险一金"],
                   environment="户外作业", status="published"))
    if not db.query(Task).filter(Task.title == "山区物资运输航线规划").first():
        db.add(Task(publisher_id=company_owner.id, title="山区物资运输航线规划", city="北京", location="延庆山区",
                    work_at="明日 09:00", deadline="本周内", aircraft="多旋翼运输机", caac="超视距", duration="1天",
                    budget=Decimal("2600"), delivery="航线方案与风险清单", acceptance="客户线上验收", description="制定安全运输航线并提交可执行方案", urgent=True, status="published"))


def _market(db, pilot):
    product = db.query(MarketProduct).filter(MarketProduct.sn == "DJI-M3E-DEMO-001").first()
    if not product:
        product = MarketProduct(seller_id=pilot.id, title="DJI Mavic 3 行业版", category="drone", brand="DJI", model="Mavic 3E", city="北京",
                                price=Decimal("9800"), summary="九成新，电池健康度待核验", images=["/static/images/lowair-market-drone.png"],
                                delivery=["邮寄", "自提"], sn="DJI-M3E-DEMO-001", verification_status="pending", listing_status="published", stock=2)
        db.add(product); db.flush()
        db.add(RentalPlan(product_id=product.id, name="短租 1-7 天", daily_price=Decimal("280"), deposit=Decimal("2000"), available_units=1))
        db.add(DeviceHistoryEvent(sn=product.sn, event_type="购入", note="设备履历待接入原厂服务", source="本地演示", verification_status="pending", occurred_at=datetime.now(timezone.utc)))
        db.add(InspectionReport(product_id=product.id, source="质检服务待接入", status="pending", report_data={"note": "暂无权威报告"}))
    else:
        product.category = "drone"
        if product.images and product.images[0].endswith("drone-aerial.jpg"): product.images = ["/static/images/lowair-market-drone.png"]
    accessory = db.query(MarketProduct).filter(MarketProduct.title == "Mavic 3 电池与桨叶配件包").first()
    if not accessory:
        db.add(MarketProduct(seller_id=pilot.id, title="Mavic 3 电池与桨叶配件包", category="accessory", brand="DJI", model="Mavic 3", city="北京",
                             price=Decimal("680"), summary="原装兼容配件，库存有限", images=["/static/images/lowair-market-accessories.png"],
                             delivery=["邮寄"], verification_status="pending", listing_status="published", stock=8))
    else:
        accessory.category = "accessory"
        if accessory.images and accessory.images[0].endswith("accessory.png"): accessory.images = ["/static/images/lowair-market-accessories.png"]
    if not db.query(MarketProduct).filter(MarketProduct.title == "DJI Mavic 3E 全新行业套装").first():
        db.add(MarketProduct(seller_id=pilot.id, title="DJI Mavic 3E 全新行业套装", category="new_drone", brand="DJI", model="Mavic 3E", city="北京", price=Decimal("26800"), summary="全新未激活整机，含原厂遥控器与基础保障，库存与授权以订单为准。", images=["/static/images/lowair-used-drone-flight.png", "/static/images/lowair-market-drone.png"], delivery=["邮寄", "自提"], verification_status="pending", listing_status="published", stock=6))
    rental = db.query(MarketProduct).filter(MarketProduct.title == "Matrice 30T 行业短租").first()
    if not rental:
        rental = MarketProduct(seller_id=pilot.id, title="Matrice 30T 行业短租", category="rental", brand="DJI", model="Matrice 30T", city="北京", price=Decimal("680"), summary="按日租赁，押金、档期和保障方案以报价接口为准。", images=["/static/images/lowair-work-inspection.png"], delivery=["自提"], verification_status="pending", listing_status="published", stock=2)
        db.add(rental); db.flush(); db.add(RentalPlan(product_id=rental.id, name="短租 1-7 天", daily_price=Decimal("680"), deposit=Decimal("6000"), available_units=2))
    providers = [
        ("京航无人机维修中心", "北京", "朝阳", "DJI / Autel 检测与云台维修", ["DJI", "Autel"], ["故障检测", "云台维修", "电池检测"]),
        ("顺义低空设备服务站", "北京", "顺义", "行业机保养与寄修受理", ["DJI"], ["周期保养", "进水检测", "寄修受理"]),
        ("成都智飞维修站", "成都", "双流", "植保机与行业机维修", ["DJI", "XAG"], ["植保机维修", "电机更换", "上门评估"]),
    ]
    for name, city, district, address, brands, services in providers:
        item = db.query(RepairProvider).filter(RepairProvider.name == name).first()
        if not item:
            db.add(RepairProvider(name=name, city=city, district=district, address=address, brands=brands, services=services, verification_status="pending", source="本地服务商演示目录，资质待核验"))


def _community(db, pilot, admin):
    topic = db.query(CommunityTopic).filter(CommunityTopic.name == "飞行安全").first()
    if not topic:
        topic = CommunityTopic(name="飞行安全"); db.add(topic); db.flush()
    if not db.query(CommunityPost).filter(CommunityPost.title == "山区作业的返航点复盘").first():
        db.add(CommunityPost(author_id=pilot.id, topic_id=topic.id, title="山区作业的返航点复盘", content="记录返航点、备降点和现场风速阈值，欢迎交流。",
                              post_type="image", visibility="public", city="北京", moderation_status="approved"))
    posts = [
        ("Mavic 3E 正射测绘参数记录", "今天完成园区正射采集，航高、重叠率和光照变化都记在了作业日志里。", "flight_log"),
        ("电池循环次数怎么看更可靠", "二手设备验机时不要只看循环次数，还要结合压差、存储电量和外观状态。", "image"),
        ("CAAC 超视距备考错题整理", "把法规、气象和应急处置分成三组复盘，欢迎补充容易混淆的知识点。", "question"),
        ("周末飞场训练复盘", "训练前先核对场地规则和临时通告，现场风速变化比预报更值得持续观察。", "image"),
    ]
    for title, content, post_type in posts:
        if not db.query(CommunityPost).filter(CommunityPost.title == title).first():
            db.add(CommunityPost(author_id=pilot.id, topic_id=topic.id, title=title, content=content, post_type=post_type,
                                 visibility="public", city="北京", moderation_status="approved"))
    if not db.query(CommunityPost).filter(CommunityPost.title == "平台安全提醒：飞前先核对临时通告").first():
        db.add(CommunityPost(author_id=admin.id, topic_id=topic.id, title="平台安全提醒：飞前先核对临时通告", content="城市级天气和社区经验不能替代当次空域许可、现场测风与设备手册限制。", post_type="official", visibility="public", city="北京", moderation_status="approved"))
    if not db.query(CommunityKnowledgeEntry).filter(CommunityKnowledgeEntry.title == "临时空域通告核验指南").first():
        db.add(CommunityKnowledgeEntry(source_type="official", title="临时空域通告核验指南", summary="飞行前通过权威渠道核对当日通告。",
                                        source_name="来源待接入", source_url=None, source_status="待核验", status="published"))
    if not db.query(CommunityLiveRoom).filter(CommunityLiveRoom.title == "无人机巡检安全公开课").first():
        db.add(CommunityLiveRoom(host_id=pilot.id, title="无人机巡检安全公开课", state="scheduled", schedule_text="周五 19:30",
                                  stream_url=None, viewer_count=0))
    field = db.query(CommunityNearbyPlace).filter(CommunityNearbyPlace.name == "顺义低空实训飞场").first()
    if not field:
        field = CommunityNearbyPlace(name="顺义低空实训飞场", city="北京", district="顺义", schedule_text="09:00-18:00",
                                     status="待核验", risk_status="unknown", source_name="地点服务待接入", note="不构成飞行许可")
        db.add(field)
    field.place_type = "field"
    if not db.query(CommunityNearbyPlace).filter(CommunityNearbyPlace.name == "北京低空安全交流日").first():
        db.add(CommunityNearbyPlace(place_type="event", name="北京低空安全交流日", city="北京", district="朝阳", schedule_text="周六 14:00",
                                    status="报名开放", risk_status="review", source_name="活动主办方待核验", note="报名后提供区级集合范围"))
    if not db.query(CommunityPresence).filter(CommunityPresence.user_id == pilot.id).first():
        db.add(CommunityPresence(user_id=pilot.id, city="北京", district="顺义", specialty="行业机巡与飞行安全", enabled=True))


def seed_demo_data(db):
    admin = _user(db, "19991490710", "本地管理员", "admin")
    pilot = _user(db, "19982442654", "演示飞手", "pilot")
    company_owner = _user(db, "19989012290", "演示企业", "enterprise")
    institution_owner = _user(db, "19964996120", "演示机构", "institution")
    for user, verification_type in ((pilot, "caac"), (company_owner, "enterprise"), (institution_owner, "institution")):
        record = db.query(VerificationApplication).filter(VerificationApplication.user_id == user.id, VerificationApplication.verification_type == verification_type).first()
        if not record:
            db.add(VerificationApplication(user_id=user.id, verification_type=verification_type, status="pending", materials={"source": "本地演示，待人工审核"}, submitted_at=datetime.now(timezone.utc)))
    _home(db); _academy(db, institution_owner, pilot); _work(db, company_owner, pilot); _market(db, pilot); _community(db, pilot, admin)
    if not db.query(AdPlacement).filter(AdPlacement.name == "首页信息流").first():
        db.add(AdPlacement(name="首页信息流", city="", description="无人机行业推广位", status="active"))
    if not db.query(UserNotification).filter(UserNotification.recipient_id == pilot.id, UserNotification.title == "欢迎使用低空经济").first():
        db.add(UserNotification(recipient_id=pilot.id, category="system", title="欢迎使用低空经济", summary="演示账号已准备好，可浏览各业务域。", payload={}))
    db.commit()


def main() -> None:
    from app.db.init_db import init_db
    init_db(seed=False)
    with SessionLocal() as db:
        seed_demo_data(db)
    print("Seeded local demo accounts (password: REDACTED_SECRET) and domain records.")


if __name__ == "__main__":
    main()
