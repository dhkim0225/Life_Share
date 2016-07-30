var iamporter = require('iamporter').createClient({
  apiKey: 'YOUR_API_KEY',
  secret: 'YOUR_SECRET'
});

// 비인증 결제를 위한 빌링키 생성
iamporter.createSubscriber({
  'customer_uid': 'test_uid',
  'card_number': '1234-1234-1234-1234',
  'expiry': '2021-11',
  'birth': '620201',
  'pwd_2digit': '99'
}).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 비인증 결제를 위한 빌링키 조회
iamporter.getSubscriber('test_uid')
.then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 비인증 결제를 위한 빌링키 삭제
iamporter.deleteSubscriber('test_uid')
.then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// Onetime 비인증 결제
iamporter.payOnetime({
  'merchant_uid': 'test_merchant',
  'amount': 5000,
  'card_number': '1234-1234-1234-1234',
  'expiry': '2021-12',
  'birth': '590912',
  'pwd_2digit': '11'
}).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 비인증 결제 (빌링키 이용)
iamporter.paySubscriber({
  'customer_uid': 'test_uid',
  'merchant_uid': 'test_billing_key',
  'amount': 50000
}).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 결제 취소 (MerchantUid 이용)
iamporter.cancelByMerchantUid(
  'test_billing_key'
).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 결제 취소 (ImpUid 이용)
iamporter.cancelByImpUid(
  'test_imp_uid'
).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 결제 취소
iamporter.cancel({
  'imp_uid': 'test_imp_uid',
  'amount': 2500,
  'reason': 'bad product',
  'refund_holder': '박병진',
  'refund_bank': '03',
  'refund_account': '056-076923-01-017'
}).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 결제정보 조회 (MerchantUid 이용)
iamporter.findByMerchantUid(
  'test_billing_key'
).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});

// 결제정보 조회 (ImpUid 이용)
iamporter.findByImpUid(
  'test_imp_uid'
).then(function (result) {
  console.log(result);
}).catch(function (error) {
  console.log(error);
});