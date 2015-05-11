describe('init()', function() {
  it('should throw exception on missing arguments', function() {
    var fn = dodgercms.s3.init;
    chai.expect(fn).to.throw('Missing arguments');
  });
});